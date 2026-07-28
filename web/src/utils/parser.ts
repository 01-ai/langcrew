/**
 * From URL or extract the file extension (without a point) in the file path.
 * Gemini Generate
 * @param urlOrPath Full URL or the file path.
 * @returns Ripped extension (lowcase), returns an empty string if it does not exist.
 */
export const getFileExtension = (urlOrPath?: string): string => {
  // 1. Check empty and non-string type
  if (!urlOrPath || typeof urlOrPath !== 'string') {
    return '';
  }

  // 2. Clear query parameters (For example:: ?v=123) & Snippet identifier (For example:: #section)
  //   Keep Only '?' The part before.
  const cleanPath = urlOrPath.split('?')[0].split('#')[0];

  // 3. Extracting filenames
  //   Find the last one. '/' , fetch the string behind
  const filenameWithEncoding = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);

  // 4. Processing URL Encoding (For example:: %20 -> space)
  let filename;
  try {
    filename = decodeURIComponent(filenameWithEncoding);
  } catch (e) {
    // If decodeURIComponent Failed (Invalid input)，Use uncoded original string
    filename = filenameWithEncoding;
  }

  // 5. Find Points('.')Index to
  //   Attention: We only care about the last point.
  const dotIndex = filename.lastIndexOf('.');

  // 6. Require the dot to appear after the first character so files such as .bashrc are not treated as extensions.
  //    dotIndex > 0: Ensure that dots are not the first character of the filename (e.g.) .gitignore）
  if (dotIndex > 0) {
    // Return to the part after the point and turn to lowercase
    return filename.substring(dotIndex + 1).toLowerCase();
  }

  return '';
};

/*
 * Check one. URL Whether to include encoder characters
 * @param url Pending examination URL String
 * @returns Boolean value, if URL , and then the encoded character returns true
 * For example::
 * isEncoded('https://example.com/file%20name') // true
 * isEncoded('https://example.com/file_name') // false
 */
export const isEncoded = (url: string) => {
  try {
    // If the string before and after decoding is not equal, specify that the original string contains encoding characters
    return url !== decodeURIComponent(url);
  } catch (e) {
    // If you're wrong, explain. % No correct hexadecimal number followed.
    return false;
  }
};

export const appendQueryParam = (url: string, key: string, value: string | number | boolean) => {
  const hashIndex = url.indexOf('#');
  const urlWithoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const separator = urlWithoutHash.includes('?') ? '&' : '?';

  // Keep Signature URL As it is, avoid. URLSearchParams Re-sequencing already query value.
  return `${urlWithoutHash}${separator}${encodeURIComponent(key)}=${encodeURIComponent(String(value))}${hash}`;
};
