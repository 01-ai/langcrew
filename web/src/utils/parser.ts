/**
 * Extract the file extension from a URL or path (no dot).
 * Gemini-generated
 * @param urlOrPath Full URL or file path.
 * @returns Lowercase extension, or empty string.
 */
export const getFileExtension = (urlOrPath?: string): string => {
  // 1. Reject empty/non-string
  if (!urlOrPath || typeof urlOrPath !== 'string') {
    return '';
  }

  // 2. Strip query (e.g. ?v=123) and hash (e.g. #section)
  //   Keep only the part before '?'
  const cleanPath = urlOrPath.split('?')[0].split('#')[0];

  // 3. Take the filename
  //   Take the substring after the last '/'
  const filenameWithEncoding = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);

  // 4. Decode URL encoding (e.g. %20 -> space)
  let filename;
  try {
    filename = decodeURIComponent(filenameWithEncoding);
  } catch (e) {
    // If decodeURIComponent fails, keep the original string
    filename = filenameWithEncoding;
  }

  // 5. Find the '.' index
  //   Only the last dot matters
  const dotIndex = filename.lastIndexOf('.');

  // 6. Ignore a leading dot (e.g. .bashrc)
  //    dotIndex > 0: the dot is not the first character (e.g. .gitignore)
  if (dotIndex > 0) {
    // Return the substring after the dot, lowercased
    return filename.substring(dotIndex + 1).toLowerCase();
  }

  return '';
};

/*
 * Whether a URL contains encoded characters
 * @param url URL to inspect
 * @returns true if the URL contains encoded characters
 * Example:
 * isEncoded('https://example.com/file%20name') // true
 * isEncoded('https://example.com/file_name') // false
 */
export const isEncoded = (url: string) => {
  try {
    // If decode changes the string, it contained encoded characters
    return url !== decodeURIComponent(url);
  } catch (e) {
    // A throw means % is not followed by valid hex
    return false;
  }
};

export const appendQueryParam = (url: string, key: string, value: string | number | boolean) => {
  const hashIndex = url.indexOf('#');
  const urlWithoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const separator = urlWithoutHash.includes('?') ? '&' : '?';

  // Keep signed URLs intact; do not re-serialize existing query via URLSearchParams.
  return `${urlWithoutHash}${separator}${encodeURIComponent(key)}=${encodeURIComponent(String(value))}${hash}`;
};
