import { useState, useEffect, useCallback } from 'react';

export interface UrlContentState {
  data: string | null;
  fileType: string;
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
}

// File Type Test Configuration
const FILE_SIGNATURES = {
  // OfficeDocument
  docx: [0x50, 0x4b, 0x03, 0x04], // DOCX (ZIP based)
  xlsx: [0x50, 0x4b, 0x03, 0x04], // XLSX (ZIP based)
  pptx: [0x50, 0x4b, 0x03, 0x04], // PPTX (ZIP based)

  // PDF
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF

  // Compress File
  zip: [0x50, 0x4b, 0x03, 0x04], // ZIP
  rar: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07], // RAR
  gz: [0x1f, 0x8b], // GZIP
};

/**
 * TestArrayBufferFile type
 * @param buffer ArrayBuffer
 * @returns File Type String
 */
const detectFileType = (buffer: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(buffer);

  // Yes.ZIPFormat File(s)docx、xlsx、pptx），Need to be further distinguished
  if (matchesSignature(uint8Array, FILE_SIGNATURES.zip)) {
    // InspectionZIPFile content to distinguishOfficeDocument Type
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
 * Checks whether byte array matches the file signature
 * @param uint8Array Byte arrays
 * @param signature Document signature
 * @returns Matches
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
 * CacheURLContents
 */
const cache = new Map<string, string>();

/**
 * CacheURLFile type
 */
const cacheFileType = new Map<string, string>();

/**
 * Cache PDF blobs instead of object URLs. Object URLs belong to the component
 * instance that creates them and may be revoked when that instance unmounts.
 */
const cacheBlob = new Map<string, Blob>();

/**
 * Checks if text contains a sprite
 */
const hasGarbledText = (text: string): boolean => {
  // Checks if you contain common obscurity characters
  const garbledPatterns = [
    /[\uFFFD]/g, // UnicodeReplace Character
    /[\u007F-\u009F]/g, // Control Character
    /[\uFFFE\uFFFF]/g, // Unicode BOMRelevant
  ];

  return garbledPatterns.some((pattern) => pattern.test(text));
};

/**
 * Checks if text contains valid Chinese characters
 */
const hasValidChineseText = (text: string): boolean => {
  // Check if Chinese characters are included
  const chinesePattern = /[\u4e00-\u9fa5]/;
  return chinesePattern.test(text);
};

/**
 * Check if the text contains Cyrillic letters (Russian, Kazakh, etc.)
 */
const hasCyrillicText = (text: string): boolean => {
  // Cyrillic Alphabetical Range:U+0400 Present. U+04FF
  const cyrillicPattern = /[\u0400-\u04FF]/;
  return cyrillicPattern.test(text);
};

/**
 * Try decoded text in different encoding formats
 */
const tryDecodeWithDifferentEncodings = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const encodings = ['utf-8', 'gbk', 'gb2312', 'big5', 'shift-jis'];
  let bestResult = '';
  let bestScore = 0;

  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding);
      const text = decoder.decode(arrayBuffer);

      // Check if the decoding works
      if (text.length > 0 && !hasGarbledText(text)) {
        let score = 0;

        // If Chinese is included, calculate the Chinese mass score
        if (hasValidChineseText(text)) {
          const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
          if (chineseChars) {
            score += chineseChars.length * 10; // The more Chinese characters, the higher the score.
          }
        }

        // If you include Cyrillic letters, here.UTF-8Higher Priority
        if (hasCyrillicText(text)) {
          const cyrillicChars = text.match(/[\u0400-\u04FF]/g);
          if (cyrillicChars) {
            // Cyrillic letters should be used.UTF-8Encoding
            if (encoding === 'utf-8') {
              score += cyrillicChars.length * 100; // Here.UTF-8Very high score.
            } else {
              score += cyrillicChars.length; // Other code scores are low
            }
          }
        }

        // Check if there are common onesCSVSeparator and Line Break
        if (text.includes(',') || text.includes('\n')) {
          score += 5;
        }

        // Check if there are common onesCSVContent (numbers, letters, etc.)
        const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
        score += alphanumericCount;

        // If this code has higher scores, update the best results.
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

  // If you find a good result, return it.
  if (bestResult) {
    return bestResult;
  }

  // If all the codes fail, useUTF-8As backup
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(arrayBuffer);
};

/**
 * FromURLFrom Contenthook
 * @param url To retrieve contentURL
 * @param options Configure Options
 * @returns Object containing data, loading status and error information, and method of manually obtaining content
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

  // Get Content
  const fetchContent = useCallback(
    async (targetUrl?: string) => {
      // If cache exists, return the cache content directly
      if (cache.has(targetUrl)) {
        const cachedBlob = cacheBlob.get(targetUrl);
        setState({
          data: cache.get(targetUrl),
          fileType: cacheFileType.get(targetUrl) || '',
          blobUrl: cachedBlob ? URL.createObjectURL(cachedBlob) : '',
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

      try {
        // Request if cache does not existURLContents
        const response = await fetch(targetUrl);
        if (response.ok) {
          // Fetching coding information for response
          const contentTypeHeader = contentType || response.headers.get('content-type') || '';
          const arrayBuffer = await response.arrayBuffer();

          // Pass.ArrayBufferType of detection file
          const detectedType = detectFileType(arrayBuffer);

          // Yes.CSVFile, handle with more intelligent coding
          let text: string;
          if (contentTypeHeader.includes('text/csv') || targetUrl?.endsWith('.csv')) {
            // UseArrayBufferDeal with the code.
            // const arrayBuffer = await response.arrayBuffer();
            text = await tryDecodeWithDifferentEncodings(arrayBuffer);
          } else {
            // text = await response.text();
            const decoder = new TextDecoder('utf-8');
            text = decoder.decode(arrayBuffer);
          }

          let blobUrl = '';
          if (detectedType === 'pdf') {
            const blob = new Blob([arrayBuffer], { type: contentTypeHeader || 'application/pdf' });
            blobUrl = URL.createObjectURL(blob);
            cacheBlob.set(targetUrl, blob);
          }

          // Cache Contents
          cache.set(targetUrl, text);
          // Cache File Type
          cacheFileType.set(targetUrl, detectedType);

          // Set Status
          setState({
            data: text,
            fileType: detectedType,
            blobUrl,
            loading: false,
            error: null,
          });
        } else {
          // Set Status
          setState({
            data: null,
            fileType: '',
            blobUrl: '',
            loading: false,
            error: `HTTPError: ${response.status} ${response.statusText}`,
          });
        }
      } catch (error) {
        // Capture all errors (network error, decoding error, etc.)
        console.error('Failed to fetch content:', error);
        setState({
          data: null,
          fileType: '',
          blobUrl: '',
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load file',
        });
      }
    },
    [contentType],
  );

  // AutoRetrieving Content
  useEffect(() => {
    if (url) {
      // Keep signed URL untouched. Re-encoding may turn `%` into `%25`
      // and break OSS signature validation for preview requests.
      fetchContent(url);
    }
  }, [url, fetchContent]);

  return {
    ...state,
  };
};
