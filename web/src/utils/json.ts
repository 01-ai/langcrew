export const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};


/**
 * Parse partial JSON string, supporting incomplete JSON data
 * 
 * This function can handle streaming data or partially transmitted JSON strings, parsing the transmitted parts even when JSON is incomplete.
 * Particularly suitable for real-time data streams, WebSocket messages, or chunked transmission scenarios.
 * 
 * @param str JSON string to parse, can be complete or incomplete JSON
 * @returns Parsed object, returns empty object if input is empty or parsing fails
 * 
 * @example
 * // Complete JSON
 * parsePartialJson('{"name": "John", "age": 30}') // { name: "John", age: 30 }
 * 
 * // Partial JSON
 * parsePartialJson('{"name": "John", "age": 30, "hobbies": [') // { name: "John", age: 30, hobbies: [] }
 * 
 * // Empty input
 * parsePartialJson(null) // {}
 * parsePartialJson('') // {}
 */
export const parsePartialJson = (str: string | null | undefined): Record<string, any> => {
  // Handle null values or empty strings
  if (str === null || str === undefined || str.trim() === '') {
    return {};
  }

  try {
    // First try standard JSON parsing
    return JSON.parse(str);
  } catch (error) {
    // If standard parsing fails, use custom partial JSON parser
    return parseIncompleteJson(str);
  }
};

/**
 * Parse incomplete JSON string
 * 
 * Uses recursive descent parser to handle partial JSON data, can correctly parse:
 * - Incomplete key-value pairs
 * - Nested objects and arrays
 * - Various data types (strings, numbers, booleans, null, etc.)
 * - Escape characters
 * 
 * @param str Incomplete JSON string
 * @returns Parsed object
 */
const parseIncompleteJson = (str: string): Record<string, any> => {
  const result: Record<string, any> = {};

  // Remove leading and trailing whitespace
  const trimmed = str.trim();

  // If not starting with {, return empty object
  if (!trimmed.startsWith('{')) {
    return result;
  }

  // Use recursive descent parser to parse character by character
  let pos = 1; // Skip the opening {

  while (pos < trimmed.length) {
    // Skip whitespace characters
    while (pos < trimmed.length && /\s/.test(trimmed[pos])) {
      pos++;
    }

    if (pos >= trimmed.length) break;

    // Parse key (must be a string)
    if (trimmed[pos] !== '"') break;

    const keyStart = pos + 1;
    pos = findStringEnd(trimmed, pos);
    if (pos === -1) break;

    const key = trimmed.slice(keyStart, pos);
    pos++; // Skip the closing quote

    // Skip colon and whitespace characters
    while (pos < trimmed.length && (trimmed[pos] === ':' || /\s/.test(trimmed[pos]))) {
      pos++;
    }

    if (pos >= trimmed.length) break;

    // Parse value (can be any type)
    const valueResult = parseValueAt(trimmed, pos);
    result[key] = valueResult.value;
    pos = valueResult.pos;

    // Skip comma
    while (pos < trimmed.length && (trimmed[pos] === ',' || /\s/.test(trimmed[pos]))) {
      pos++;
    }
  }

  return result;
};

/**
 * Find the end position of a string, correctly handling escape characters
 * 
 * @param str String to search
 * @param start Start position (should be the position of the quote)
 * @returns Position of the closing quote, returns -1 if not found
 */
const findStringEnd = (str: string, start: number): number => {
  let escapeNext = false;

  for (let i = start + 1; i < str.length; i++) {
    const char = str[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      return i;
    }
  }

  return -1;
};

/**
 * Parse value at specified position
 * 
 * Parse according to value type (string, array, object, number, boolean, etc.)
 * 
 * @param str String to parse
 * @param start Position to start parsing
 * @returns Object containing parsed value and next position
 */
const parseValueAt = (str: string, start: number): { value: any; pos: number } => {
  // Skip whitespace characters
  while (start < str.length && /\s/.test(str[start])) {
    start++;
  }

  if (start >= str.length) {
    return { value: undefined, pos: start };
  }

  const char = str[start];

  // Parse string
  if (char === '"') {
    const end = findStringEnd(str, start);
    if (end === -1) {
      // Incomplete string (no closing quote)
      const stringValue = str.slice(start + 1);
      return {
        value:
          stringValue === ''
            ? undefined
            : stringValue
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t'),
        pos: str.length,
      };
    }

    // Complete string
    const stringValue = str.slice(start + 1, end);
    return {
      value:
        stringValue === ''
          ? undefined
          : stringValue
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t'),
      pos: end + 1,
    };
  }

  // Parse array
  if (char === '[') {
    const arrayResult = parseArrayAt(str, start);
    return { value: arrayResult.value, pos: arrayResult.pos };
  }

  // Parse object
  if (char === '{') {
    const objectResult = parseObjectAt(str, start);
    return { value: objectResult.value, pos: objectResult.pos };
  }

  // Parse other values (numbers, booleans, null, etc.)
  let end = start;
  while (end < str.length && str[end] !== ',' && str[end] !== '}' && str[end] !== ']') {
    end++;
  }

  const valueStr = str.slice(start, end).trim();

  if (valueStr === '') {
    return { value: undefined, pos: end };
  }

  // Handle numbers
  if (/^-?\d+(?:\.\d+)?$/.test(valueStr)) {
    return { value: parseFloat(valueStr), pos: end };
  }

  // Handle booleans
  if (valueStr === 'true') {
    return { value: true, pos: end };
  }
  if (valueStr === 'false') {
    return { value: false, pos: end };
  }

  // Handle null
  if (valueStr === 'null') {
    return { value: null, pos: end };
  }

  // Handle undefined
  if (valueStr === 'undefined') {
    return { value: undefined, pos: end };
  }

  return { value: undefined, pos: end };
};

/**
 * Parse array
 * 
 * Parse array starting with [, supports:
 * - Empty array []
 * - Arrays containing various types of elements
 * - Incomplete arrays (e.g., ["item1", "item2")
 * 
 * Note: Even if the array is incomplete, it returns the parsed elements, empty array returns [] instead of undefined
 * 
 * @param str String to parse
 * @param start Position where array starts (position of [)
 * @returns Object containing parsed array and next position
 */
const parseArrayAt = (str: string, start: number): { value: any[]; pos: number } => {
  const result: any[] = [];
  let pos = start + 1; // Skip the opening [

  while (pos < str.length) {
    // Skip whitespace characters
    while (pos < str.length && /\s/.test(str[pos])) {
      pos++;
    }

    if (pos >= str.length) break;

    // Check if reached end of array
    if (str[pos] === ']') {
      // If array is empty, return empty array instead of undefined
      return { value: result, pos: pos + 1 };
    }

    // Parse array element
    const elementResult = parseValueAt(str, pos);
    result.push(elementResult.value);
    pos = elementResult.pos;

    // Skip comma
    while (pos < str.length && (str[pos] === ',' || /\s/.test(str[pos]))) {
      pos++;
    }
  }

  // If array is not closed, also return parsed elements (might be empty array)
  return { value: result, pos: str.length };
};

/**
 * Parse nested object
 * 
 * Parse object starting with {, supports:
 * - Empty object {}
 * - Objects containing various types of values
 * - Incomplete objects (e.g., {"name": "John", "age": 30)
 * 
 * @param str String to parse
 * @param start Position where object starts (position of {)
 * @returns Object containing parsed object and next position
 */
const parseObjectAt = (str: string, start: number): { value: Record<string, any>; pos: number } => {
  const result: Record<string, any> = {};
  let pos = start + 1; // Skip the opening {

  while (pos < str.length) {
    // Skip whitespace characters
    while (pos < str.length && /\s/.test(str[pos])) {
      pos++;
    }

    if (pos >= str.length) break;

    // Check if reached end of object
    if (str[pos] === '}') {
      return { value: result, pos: pos + 1 };
    }

    // Parse key (must be a string)
    if (str[pos] !== '"') break;

    const keyStart = pos + 1;
    pos = findStringEnd(str, pos);
    if (pos === -1) break;

    const key = str.slice(keyStart, pos);
    pos++; // Skip the closing quote

    // Skip colon and whitespace characters
    while (pos < str.length && (str[pos] === ':' || /\s/.test(str[pos]))) {
      pos++;
    }

    if (pos >= str.length) break;

    // Parse value (can be any type)
    const valueResult = parseValueAt(str, pos);
    result[key] = valueResult.value;
    pos = valueResult.pos;

    // Skip comma
    while (pos < str.length && (str[pos] === ',' || /\s/.test(str[pos]))) {
      pos++;
    }
  }

  return { value: result, pos: str.length };
};

/**
 * Parse value string (compatible with old version, deprecated)
 * 
 * @deprecated This function has been replaced by parseValueAt, kept for backward compatibility
 * @param valueStr Value string to parse
 * @returns Parsed value
 */
const parseValue = (valueStr: string): any => {
  if (valueStr === '' || valueStr === 'undefined') {
    return undefined;
  }

  // Handle string
  if (valueStr.startsWith('"')) {
    let stringValue = valueStr.slice(1); // Remove opening quote

    // If ends with quote, remove closing quote
    if (stringValue.endsWith('"')) {
      stringValue = stringValue.slice(0, -1);
    }

    // Handle escape characters
    return stringValue
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');
  }

  // 处理数组
  if (valueStr.startsWith('[')) {
    return parsePartialArray(valueStr);
  }

  // 处理对象
  if (valueStr.startsWith('{')) {
    return parsePartialJson(valueStr);
  }

  // Handle numbers
  if (/^-?\d+(?:\.\d+)?$/.test(valueStr)) {
    return parseFloat(valueStr);
  }

  // Handle booleans
  if (valueStr === 'true') {
    return true;
  }
  if (valueStr === 'false') {
    return false;
  }

  // Handle null
  if (valueStr === 'null') {
    return null;
  }

  // Default return undefined
  return undefined;
};

/**
 * Parse partial array (compatible with old version, deprecated)
 * 
 * @deprecated This function has been replaced by parseArrayAt, kept for backward compatibility
 * @param str Array string to parse
 * @returns Parsed array
 */
const parsePartialArray = (str: string): any[] => {
  const result: any[] = [];

  // Remove opening [
  const content = str.slice(1).trim();

  // If array is empty or incomplete, return undefined
  if (content === '' || content.startsWith(']')) {
    return undefined as any;
  }

  // Use state machine to parse array elements
  let i = 0;
  let currentElement = '';
  let inString = false;
  let escapeNext = false;
  let braceDepth = 0;
  let bracketDepth = 0;

  while (i < content.length) {
    const char = content[i];

    if (escapeNext) {
      currentElement += char;
      escapeNext = false;
      i++;
      continue;
    }

    if (char === '\\') {
      currentElement += char;
      escapeNext = true;
      i++;
      continue;
    }

    if (char === '"' && !inString) {
      inString = true;
      currentElement += char;
    } else if (char === '"' && inString) {
      inString = false;
      currentElement += char;
    } else if (char === '{' && !inString) {
      braceDepth++;
      currentElement += char;
    } else if (char === '}' && !inString) {
      braceDepth--;
      currentElement += char;
    } else if (char === '[' && !inString) {
      bracketDepth++;
      currentElement += char;
    } else if (char === ']' && !inString) {
      bracketDepth--;
      currentElement += char;
    } else if (char === ',' && !inString && braceDepth === 0 && bracketDepth === 0) {
      // Handle current element
      const element = currentElement.trim();
      if (element !== '') {
        result.push(parseValue(element));
      }
      currentElement = '';
    } else {
      currentElement += char;
    }

    i++;
  }

  // Handle last element
  const element = currentElement.trim();
  if (element !== '' && !element.endsWith(']')) {
    result.push(parseValue(element));
  }

  return result;
};



