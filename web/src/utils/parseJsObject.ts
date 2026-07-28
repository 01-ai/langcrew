/**
 * Parse a JavaScript object literal string into an object.
 * Falls back to using Function constructor when strict JSON parsing fails,
 * enabling support for unquoted keys, trailing commas, etc.
 *
 * @param input Raw string to parse
 * @returns Parsed object
 */
export function parseJsObject(input: string): any {
  const normalizedStr = (input || '').trim();

  if (!normalizedStr) {
    return {};
  }

  try {
    return JSON.parse(normalizedStr);
  } catch {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('return (' + normalizedStr + ')');
      return fn();
    } catch (error) {
      const err = error as Error;
      throw new Error(`Invalid object format: ${err.message}`);
    }
  }
}

export default parseJsObject;
