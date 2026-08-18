export const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};


/**
 * Parse partial JSON, including incomplete input
 * 
 * Parses streamed/partial JSON and returns whatever has arrived so far.
 * Useful for streams, WebSocket, or chunked transfer.
 * 
 * @param str JSON string, complete or partial
 * @returns Parsed object, or {} on empty/failure
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
  // Handle null/empty string
  if (str === null || str === undefined || str.trim() === '') {
    return {};
  }

  try {
    // Try standard JSON.parse first
    return JSON.parse(str);
  } catch (error) {
    // Fall back to the partial JSON parser
    return parseIncompleteJson(str);
  }
};

/**
 * Parse an incomplete JSON string
 * 
 * Recursive-descent parser for partial JSON. Handles:
 * - Incomplete key/value pairs
 * - Nested objects and arrays
 * - Mixed types (string, number, boolean, null, ...)
 * - Escape characters
 * 
 * @param str Incomplete JSON string
 * @returns Parsed object
 */
const parseIncompleteJson = (str: string): Record<string, any> => {
  const result: Record<string, any> = {};

  // Trim whitespace
  const trimmed = str.trim();

  // Return {} if it does not start with {
  if (!trimmed.startsWith('{')) {
    return result;
  }

  // Recursive-descent, character by character
  let pos = 1; // Skip leading {

  while (pos < trimmed.length) {
    // Skip whitespace
    while (pos < trimmed.length && /\s/.test(trimmed[pos])) {
      pos++;
    }

    if (pos >= trimmed.length) break;

    // Parse a key (must be a string)
    if (trimmed[pos] !== '"') break;

    const keyStart = pos + 1;
    pos = findStringEnd(trimmed, pos);
    if (pos === -1) break;

    const key = trimmed.slice(keyStart, pos);
    pos++; // Skip the closing quote

    // Skip colon and whitespace
    while (pos < trimmed.length && (trimmed[pos] === ':' || /\s/.test(trimmed[pos]))) {
      pos++;
    }

    if (pos >= trimmed.length) break;

    // Parse a value (any type)
    const valueResult = parseValueAt(trimmed, pos);
    result[key] = valueResult.value;
    pos = valueResult.pos;

    // Skip commas
    while (pos < trimmed.length && (trimmed[pos] === ',' || /\s/.test(trimmed[pos]))) {
      pos++;
    }
  }

  return result;
};

/**
 * Find the string end, honoring escapes
 * 
 * @param str String to search
 * @param start Start index (should be a quote)
 * @returns Closing-quote index, or -1
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
 * Parse the value at an index
 * 
 * Parse by value type (string, array, object, number, boolean, ...)
 * 
 * @param str String to parse
 * @param start Parse start index
 * @returns Parsed value and next index
 */
const parseValueAt = (str: string, start: number): { value: any; pos: number } => {
  // Skip whitespace
  while (start < str.length && /\s/.test(str[start])) {
    start++;
  }

  if (start >= str.length) {
    return { value: undefined, pos: start };
  }

  const char = str[start];

  // Parse a string
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

  // Parse an array
  if (char === '[') {
    const arrayResult = parseArrayAt(str, start);
    return { value: arrayResult.value, pos: arrayResult.pos };
  }

  // Parse an object
  if (char === '{') {
    const objectResult = parseObjectAt(str, start);
    return { value: objectResult.value, pos: objectResult.pos };
  }

  // Parse other values (number, boolean, null, ...)
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
 * Parse an array
 * 
 * Parse an array starting with [, supporting:
 * - Empty array []
 * - Arrays with mixed element types
 * - Incomplete arrays (e.g. ["item1", "item2")
 * 
 * Even incomplete arrays return parsed items; empty arrays return [] not undefined
 * 
 * @param str String to parse
 * @param start Array start index ([)
 * @returns Parsed array and next index
 */
const parseArrayAt = (str: string, start: number): { value: any[]; pos: number } => {
  const result: any[] = [];
  let pos = start + 1; // Skip leading [

  while (pos < str.length) {
    // Skip whitespace
    while (pos < str.length && /\s/.test(str[pos])) {
      pos++;
    }

    if (pos >= str.length) break;

    // Check for array end
    if (str[pos] === ']') {
      // Return [] for empty arrays, not undefined
      return { value: result, pos: pos + 1 };
    }

    // Parse an array element
    const elementResult = parseValueAt(str, pos);
    result.push(elementResult.value);
    pos = elementResult.pos;

    // Skip commas
    while (pos < str.length && (str[pos] === ',' || /\s/.test(str[pos]))) {
      pos++;
    }
  }

  // Incomplete arrays still return parsed items (maybe [])
  return { value: result, pos: str.length };
};

/**
 * Parse nested objects
 * 
 * Parse an object starting with {, supporting:
 * - Empty object {}
 * - Objects with mixed value types
 * - Incomplete objects (e.g. {"name": "John", "age": 30)
 * 
 * @param str String to parse
 * @param start Object start index ({)
 * @returns Parsed object and next index
 */
const parseObjectAt = (str: string, start: number): { value: Record<string, any>; pos: number } => {
  const result: Record<string, any> = {};
  let pos = start + 1; // Skip leading {

  while (pos < str.length) {
    // Skip whitespace
    while (pos < str.length && /\s/.test(str[pos])) {
      pos++;
    }

    if (pos >= str.length) break;

    // Check for object end
    if (str[pos] === '}') {
      return { value: result, pos: pos + 1 };
    }

    // Parse a key (must be a string)
    if (str[pos] !== '"') break;

    const keyStart = pos + 1;
    pos = findStringEnd(str, pos);
    if (pos === -1) break;

    const key = str.slice(keyStart, pos);
    pos++; // Skip the closing quote

    // Skip colon and whitespace
    while (pos < str.length && (str[pos] === ':' || /\s/.test(str[pos]))) {
      pos++;
    }

    if (pos >= str.length) break;

    // Parse a value (any type)
    const valueResult = parseValueAt(str, pos);
    result[key] = valueResult.value;
    pos = valueResult.pos;

    // Skip commas
    while (pos < str.length && (str[pos] === ',' || /\s/.test(str[pos]))) {
      pos++;
    }
  }

  return { value: result, pos: str.length };
};

/**
 * Parse a value string (legacy, deprecated)
 * 
 * @deprecated Use parseValueAt; kept for compatibility
 * @param valueStr Value string to parse
 * @returns Parsed value
 */
const parseValue = (valueStr: string): any => {
  if (valueStr === '' || valueStr === 'undefined') {
    return undefined;
  }

  // Handle strings
  if (valueStr.startsWith('"')) {
    let stringValue = valueStr.slice(1); // Strip the opening quote

    // Strip a trailing quote
    if (stringValue.endsWith('"')) {
      stringValue = stringValue.slice(0, -1);
    }

    // Handle escapes
    return stringValue
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');
  }

  // Handle arrays
  if (valueStr.startsWith('[')) {
    return parsePartialArray(valueStr);
  }

  // Handle objects
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

  // Default: undefined
  return undefined;
};

/**
 * Parse a partial array (legacy, deprecated)
 * 
 * @deprecated Use parseArrayAt; kept for compatibility
 * @param str Array string to parse
 * @returns Parsed array
 */
const parsePartialArray = (str: string): any[] => {
  const result: any[] = [];

  // Strip leading [
  const content = str.slice(1).trim();

  // Return undefined for empty/incomplete arrays
  if (content === '' || content.startsWith(']')) {
    return undefined as any;
  }

  // Parse array elements with a state machine
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
      // Handle the current element
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

  // Handle the last element
  const element = currentElement.trim();
  if (element !== '' && !element.endsWith(']')) {
    result.push(parseValue(element));
  }

  return result;
};



