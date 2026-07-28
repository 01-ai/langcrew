export const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};


/**
 * Parsing SectionJSONStrings, support incompleteJSONData
 * 
 * This function handles current data or partial transmissionsJSONString, evenJSONIncomplete can also parse the transferred part.
 * Especially for real-time data flows,WebSocketMessage or segmented transmission scene.
 * 
 * @param str It's a parse.JSONString, which can be completeJSONOr incomplete.JSON
 * @returns Parsed object returns empty object if input is empty or the resolution failed
 * 
 * @example
 * // CompleteJSON
 * parsePartialJson('{"name": "John", "age": 30}') // { name: "John", age: 30 }
 * 
 * // PartJSON
 * parsePartialJson('{"name": "John", "age": 30, "hobbies": [') // { name: "John", age: 30, hobbies: [] }
 * 
 * // Empty Input
 * parsePartialJson(null) // {}
 * parsePartialJson('') // {}
 */
export const parsePartialJson = (str: string | null | undefined): Record<string, any> => {
  // Deal with empty values or empty strings
  if (str === null || str === undefined || str.trim() === '') {
    return {};
  }

  try {
    // First try the standard.JSONParsing
    return JSON.parse(str);
  } catch (error) {
    // If standard resolution fails, use custom partJSONParser
    return parseIncompleteJson(str);
  }
};

/**
 * Parsing incompleteJSONString
 * 
 * Use the Recursive Decreasing Parsor to handle the portionJSONData that can be correctly deciphered:
 * - Incomplete key pair
 * - Embedded objects and arrays
 * - Various data types (strings, numbers, booleans,nullWait
 * - Conversion
 * 
 * @param str Incomplete.JSONString
 * @returns Parsed Object
 */
const parseIncompleteJson = (str: string): Record<string, any> => {
  const result: Record<string, any> = {};

  // Remove the blank character at the beginning and end
  const trimmed = str.trim();

  // If it wasn't for me, { Start, return empty object
  if (!trimmed.startsWith('{')) {
    return result;
  }

  // Character-by-character resolution using the Recursive Decline Resolutionr
  let pos = 1; // Skip the beginning {

  while (pos < trimmed.length) {
    // Skip whitespace characters
    while (pos < trimmed.length && /\s/.test(trimmed[pos])) {
      pos++;
    }

    if (pos >= trimmed.length) break;

    // Parsing Key (must be a string)
    if (trimmed[pos] !== '"') break;

    const keyStart = pos + 1;
    pos = findStringEnd(trimmed, pos);
    if (pos === -1) break;

    const key = trimmed.slice(keyStart, pos);
    pos++; // Skip the end quote

    // Skip colon and blank characters
    while (pos < trimmed.length && (trimmed[pos] === ':' || /\s/.test(trimmed[pos]))) {
      pos++;
    }

    if (pos >= trimmed.length) break;

    // Parsing value (can be of any type)
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
 * Finds end of string, corrects transliteration
 * 
 * @param str String to search for
 * @param start Start position (should be the quotation mark)
 * @returns Ends the quotation sign position, returns if not found-1
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
 * Parsing the value of the given position
 * 
 * Corresponding resolution by type of value (string, array, object, number, boolean, etc.)
 * 
 * @param str String to parse
 * @param start Start Parsing Location
 * @returns Object with parsed values and next position
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

  // Parsing Strings
  if (char === '"') {
    const end = findStringEnd(str, start);
    if (end === -1) {
      // Incomplete string (no end quote)
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

    // Full String
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

  // Parsing arrays
  if (char === '[') {
    const arrayResult = parseArrayAt(str, start);
    return { value: arrayResult.value, pos: arrayResult.pos };
  }

  // Parsing Object
  if (char === '{') {
    const objectResult = parseObjectAt(str, start);
    return { value: objectResult.value, pos: objectResult.pos };
  }

  // Parsing other values (number, boolean, value)nullWait
  let end = start;
  while (end < str.length && str[end] !== ',' && str[end] !== '}' && str[end] !== ']') {
    end++;
  }

  const valueStr = str.slice(start, end).trim();

  if (valueStr === '') {
    return { value: undefined, pos: end };
  }

  // Processing numbers
  if (/^-?\d+(?:\.\d+)?$/.test(valueStr)) {
    return { value: parseFloat(valueStr), pos: end };
  }

  // Handle Boolean Values
  if (valueStr === 'true') {
    return { value: true, pos: end };
  }
  if (valueStr === 'false') {
    return { value: false, pos: end };
  }

  // Processingnull
  if (valueStr === 'null') {
    return { value: null, pos: end };
  }

  // Processingundefined
  if (valueStr === 'undefined') {
    return { value: undefined, pos: end };
  }

  return { value: undefined, pos: end };
};

/**
 * Parsing arrays
 * 
 * Parsing to [ , in support of:
 * - Empty array []
 * - Numerical arrays containing various types of elements
 * - Incomplete arrays (e. g.) ["item1", "item2"）
 * 
 * Note: Even if the array is incomplete, the parsed elements return, and the empty array returns [] Not undefined
 * 
 * @param str String to parse
 * @param start Location of array start (in %2)[ )
 * @returns Object containing the parsed array and next position
 */
const parseArrayAt = (str: string, start: number): { value: any[]; pos: number } => {
  const result: any[] = [];
  let pos = start + 1; // Skip the beginning [

  while (pos < str.length) {
    // Skip whitespace characters
    while (pos < str.length && /\s/.test(str[pos])) {
      pos++;
    }

    if (pos >= str.length) break;

    // Check to reach the end of the array
    if (str[pos] === ']') {
      // If the array is empty, return the empty array instead ofundefined
      return { value: result, pos: pos + 1 };
    }

    // Parsing array elements
    const elementResult = parseValueAt(str, pos);
    result.push(elementResult.value);
    pos = elementResult.pos;

    // Skip comma
    while (pos < str.length && (str[pos] === ',' || /\s/.test(str[pos]))) {
      pos++;
    }
  }

  // If arrays do not end, also return the parsed elements (possibly empty arrays)
  return { value: result, pos: str.length };
};

/**
 * Parsing embedded objects
 * 
 * Parsing to { The first object, supports:
 * - Empty objects {}
 * - Objects with various types of values
 * - Incomplete object (e.g. {"name": "John", "age": 30）
 * 
 * @param str String to parse
 * @param start Position of object to start ({ )
 * @returns Object with the object after the resolution and the object at the next location
 */
const parseObjectAt = (str: string, start: number): { value: Record<string, any>; pos: number } => {
  const result: Record<string, any> = {};
  let pos = start + 1; // Skip the beginning {

  while (pos < str.length) {
    // Skip whitespace characters
    while (pos < str.length && /\s/.test(str[pos])) {
      pos++;
    }

    if (pos >= str.length) break;

    // Check to reach the end of the object
    if (str[pos] === '}') {
      return { value: result, pos: pos + 1 };
    }

    // Parsing Key (must be a string)
    if (str[pos] !== '"') break;

    const keyStart = pos + 1;
    pos = findStringEnd(str, pos);
    if (pos === -1) break;

    const key = str.slice(keyStart, pos);
    pos++; // Skip the end quote

    // Skip colon and blank characters
    while (pos < str.length && (str[pos] === ':' || /\s/.test(str[pos]))) {
      pos++;
    }

    if (pos >= str.length) break;

    // Parsing value (can be of any type)
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
 * Parsing values string (compatible with old version, abandoned)
 * 
 * @deprecated This function has been parseValueAt Alternative, retain for backward compatibility
 * @param valueStr Value string to parse
 * @returns Parsing Value
 */
const parseValue = (valueStr: string): any => {
  if (valueStr === '' || valueStr === 'undefined') {
    return undefined;
  }

  // Process Strings
  if (valueStr.startsWith('"')) {
    let stringValue = valueStr.slice(1); // Remove the opening quote

    // If ending with quotation marks, remove quote marks at the end
    if (stringValue.endsWith('"')) {
      stringValue = stringValue.slice(0, -1);
    }

    // Process transliteration characters
    return stringValue
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');
  }

  // Process arrays
  if (valueStr.startsWith('[')) {
    return parsePartialArray(valueStr);
  }

  // Process Objects
  if (valueStr.startsWith('{')) {
    return parsePartialJson(valueStr);
  }

  // Processing numbers
  if (/^-?\d+(?:\.\d+)?$/.test(valueStr)) {
    return parseFloat(valueStr);
  }

  // Handle Boolean Values
  if (valueStr === 'true') {
    return true;
  }
  if (valueStr === 'false') {
    return false;
  }

  // Processingnull
  if (valueStr === 'null') {
    return null;
  }

  // Default Returnundefined
  return undefined;
};

/**
 * Parsing Part arrays (compatible with old version, abandoned)
 * 
 * @deprecated This function has been parseArrayAt Alternative, retain for backward compatibility
 * @param str Cluster string to parse
 * @returns Arrays after parsing
 */
const parsePartialArray = (str: string): any[] => {
  const result: any[] = [];

  // Remove the beginning [
  const content = str.slice(1).trim();

  // If array is empty or incomplete, returnundefined
  if (content === '' || content.startsWith(']')) {
    return undefined as any;
  }

  // Use status machine to resolve array elements
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
      // Process current elements
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

  // Process the last element
  const element = currentElement.trim();
  if (element !== '' && !element.endsWith(']')) {
    result.push(parseValue(element));
  }

  return result;
};



