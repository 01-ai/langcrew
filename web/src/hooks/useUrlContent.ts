import { useState, useEffect, useCallback } from 'react';

export interface UrlContentState {
  data: string | null;
  fileType: string;
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
}

// file type detection configuration
const FILE_SIGNATURES = {
  // Office documents
  docx: [0x50, 0x4b, 0x03, 0x04], // DOCX (ZIP based)
  xlsx: [0x50, 0x4b, 0x03, 0x04], // XLSX (ZIP based)
  pptx: [0x50, 0x4b, 0x03, 0x04], // PPTX (ZIP based)

  // PDF
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF

  // compressed files
  zip: [0x50, 0x4b, 0x03, 0x04], // ZIP
  rar: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07], // RAR
  gz: [0x1f, 0x8b], // GZIP
};

/**
 * detect the file type of ArrayBuffer
 * @param buffer ArrayBuffer
 * @returns file type string
 */
const detectFileType = (buffer: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(buffer);

  // for ZIP files (docx, xlsx, pptx), further differentiation is needed
  if (matchesSignature(uint8Array, FILE_SIGNATURES.zip)) {
    // check the content of the ZIP file to differentiate the Office document type
    const zipContent = new TextDecoder().decode(uint8Array);
    if (zipContent.includes('ppt/presentation.xml')) return 'pptx';
    if (zipContent.includes('word/document.xml')) return 'docx';
    if (zipContent.includes('xl/workbook.xml')) return 'xlsx';
    return 'zip';
  }

  if (matchesSignature(uint8Array, FILE_SIGNATURES.pdf)) {
    return 'pdf';
  }

  return 'unknown';
};

/**
 * check if the byte array matches the file signature
 * @param uint8Array byte array
 * @param signature file signature
 * @returns whether it matches
 */
const matchesSignature = (uint8Array: Uint8Array, signature: number[]): boolean => {
  if (signature.length === 0) return false;
  if (uint8Array.length < signature.length) return false;

  for (let i = 0; i < signature.length; i++) {
    if (uint8Array[i] !== signature[i]) {
      return false;
    }
  }
  return true;
};

/**
 * cache URL content
 */
const cache = new Map<string, string>();

/**
 * cache URL file type
 */
const cacheFileType = new Map<string, string>();

/**
 * cache blobUrl
 */
const cacheBlobUrl = new Map<string, string>();

/**
 * check if the text contains garbled text
 */
const hasGarbledText = (text: string): boolean => {
  // check if it contains common garbled characters
  const garbledPatterns = [
    /[\uFFFD]/g, // Unicode replacement character
    /[\u007F-\u009F]/g, // control characters
    /[\uFFFE\uFFFF]/g, // Unicode BOM related
  ];

  return garbledPatterns.some((pattern) => pattern.test(text));
};

/**
 * check if the text contains valid Chinese characters
 */
const hasValidChineseText = (text: string): boolean => {
  // check if it contains Chinese characters
  const chinesePattern = /[\u4e00-\u9fa5]/;
  return chinesePattern.test(text);
};

/**
 * try different encoding formats to decode the text
 */
const tryDecodeWithDifferentEncodings = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const encodings = ['utf-8', 'gbk', 'gb2312', 'big5', 'shift-jis'];
  let bestResult = '';
  let bestScore = 0;

  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding);
      const text = decoder.decode(arrayBuffer);

      // check if the decoding is successful
      if (text.length > 0 && !hasGarbledText(text)) {
        let score = 0;

        // if it contains Chinese, calculate the Chinese quality score
        if (hasValidChineseText(text)) {
          const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
          if (chineseChars) {
            score += chineseChars.length * 10; // the more Chinese characters, the higher the score
          }
        }

        // check if it contains common CSV separators and line breaks
        if (text.includes(',') || text.includes('\n')) {
          score += 5;
        }

        // check if it contains common CSV content (numbers, letters, etc.)
        const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
        score += alphanumericCount;

        // if the score of this encoding is higher, update the best result
        if (score > bestScore) {
          bestScore = score;
          bestResult = text;
        }
      }
    } catch (error) {
      console.warn(`Failed to decode with ${encoding}:`, error);
      continue;
    }
  }

  // if a good result is found, return it
  if (bestResult) {
    return bestResult;
  }

  // if all encodings fail, use UTF-8 as a backup
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(arrayBuffer);
};

/**
 * hook to get content from URL
 * @param url URL to get content
 * @param options configuration options
 * @returns object containing data, loading status, and error information, as well as a method to manually get content
 */
export const useUrlContent = ({ url, contentType }: { url: string | null; contentType?: string }) => {
  // state
  const [state, setState] = useState<UrlContentState>({
    data: null,
    fileType: '',
    blobUrl: '',
    loading: false,
    error: null,
  });

  // get content
  const fetchContent = useCallback(
    async (targetUrl?: string) => {
      // if the cache exists, return the cached content
      if (cache.has(targetUrl)) {
        setState({
          data: cache.get(targetUrl),
          fileType: cacheFileType.get(targetUrl) || '',
          blobUrl: cacheBlobUrl.get(targetUrl) || '',
          loading: false,
          error: null,
        });
        return;
      }

      setState({
        data: null,
        fileType: '',
        blobUrl: '',
        loading: true,
        error: null,
      });
      // if the cache does not exist, request the URL content
      const response = await fetch(targetUrl);
      if (response.ok) {
        // get the encoding information of the response
        const contentTypeHeader = contentType || response.headers.get('content-type') || '';
        const arrayBuffer = await response.arrayBuffer();

        // detect the file type through ArrayBuffer
        const detectedType = detectFileType(arrayBuffer);
        console.log('Detected file type:', detectedType);

        // for CSV files, use more intelligent encoding processing
        let text: string;
        if (contentTypeHeader.includes('text/csv') || targetUrl?.endsWith('.csv')) {
          // use ArrayBuffer to process encoding
          // const arrayBuffer = await response.arrayBuffer();
          text = await tryDecodeWithDifferentEncodings(arrayBuffer);
        } else {
          // text = await response.text();
          const decoder = new TextDecoder('utf-8');
          text = decoder.decode(arrayBuffer);
        }

        let blobUrl = '';
        if (detectedType === 'pdf') {
          const blob = new Blob([arrayBuffer], { type: contentType || '' });
          blobUrl = URL.createObjectURL(blob);
          // cache blobUrl
          cacheBlobUrl.set(targetUrl, blobUrl);
        }

        // cache content
        cache.set(targetUrl, text);
        // cache file type
        cacheFileType.set(targetUrl, detectedType);

        // set state
        setState({
          data: text,
          fileType: detectedType,
          blobUrl,
          loading: false,
          error: null,
        });
      } else {
        // set state
        setState({
          data: null,
          fileType: '',
          blobUrl: '',
          loading: false,
          error: `HTTP错误: ${response.status} ${response.statusText}`,
        });
      }
    },
    [contentType],
  );

  // automatically get content
  useEffect(() => {
    if (url) {
      fetchContent(encodeURI(url));
    }
  }, [url, fetchContent]);

  return {
    ...state,
  };
};
