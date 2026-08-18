import { useState, useEffect, useCallback } from 'react';

export interface UrlContentState {
  data: string | null;
  fileType: string;
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
}

// File type detection config
const FILE_SIGNATURES = {
  // Office documents
  docx: [0x50, 0x4b, 0x03, 0x04], // DOCX (ZIP based)
  xlsx: [0x50, 0x4b, 0x03, 0x04], // XLSX (ZIP based)
  pptx: [0x50, 0x4b, 0x03, 0x04], // PPTX (ZIP based)

  // PDF
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF

  // Archives
  zip: [0x50, 0x4b, 0x03, 0x04], // ZIP
  rar: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07], // RAR
  gz: [0x1f, 0x8b], // GZIP
};

/**
 * Detect file type from ArrayBuffer
 * @param buffer ArrayBuffer
 * @returns File type string
 */
const detectFileType = (buffer: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(buffer);

  // ZIP-based files (docx/xlsx/pptx) need further disambiguation
  if (matchesSignature(uint8Array, FILE_SIGNATURES.zip)) {
    // Inspect ZIP contents to distinguish Office types
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
 * Check whether a byte array matches a file signature
 * @param uint8Array Byte array
 * @param signature File signature
 * @returns Whether it matches
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
 * Cache URL content
 */
const cache = new Map<string, string>();

/**
 * Cache URL file type
 */
const cacheFileType = new Map<string, string>();

/**
 * Cache PDF blobs instead of object URLs. Object URLs belong to the component
 * instance that creates them and may be revoked when that instance unmounts.
 */
const cacheBlob = new Map<string, Blob>();

/**
 * Check whether text contains garbled characters
 */
const hasGarbledText = (text: string): boolean => {
  // Check for common garbled-character patterns
  const garbledPatterns = [
    /[\uFFFD]/g, // Unicode replacement character
    /[\u007F-\u009F]/g, // Control characters
    /[\uFFFE\uFFFF]/g, // Unicode BOM-related
  ];

  return garbledPatterns.some((pattern) => pattern.test(text));
};

/**
 * Check whether text contains valid CJK characters
 */
const hasValidChineseText = (text: string): boolean => {
  // Check for CJK characters
  const chinesePattern = /[\u4e00-\u9fa5]/;
  return chinesePattern.test(text);
};

/**
 * Check whether text contains Cyrillic letters (e.g. Russian, Kazakh)
 */
const hasCyrillicText = (text: string): boolean => {
  // Cyrillic range: U+0400–U+04FF
  const cyrillicPattern = /[\u0400-\u04FF]/;
  return cyrillicPattern.test(text);
};

/**
 * Try decoding text with multiple encodings
 */
const tryDecodeWithDifferentEncodings = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const encodings = ['utf-8', 'gbk', 'gb2312', 'big5', 'shift-jis'];
  let bestResult = '';
  let bestScore = 0;

  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding);
      const text = decoder.decode(arrayBuffer);

      // Check whether decoding succeeded
      if (text.length > 0 && !hasGarbledText(text)) {
        let score = 0;

        // Score CJK quality when present
        if (hasValidChineseText(text)) {
          const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
          if (chineseChars) {
            score += chineseChars.length * 10; // More CJK chars => higher score
          }
        }

        // Prefer UTF-8 when Cyrillic is present
        if (hasCyrillicText(text)) {
          const cyrillicChars = text.match(/[\u0400-\u04FF]/g);
          if (cyrillicChars) {
            // Cyrillic should decode as UTF-8
            if (encoding === 'utf-8') {
              score += cyrillicChars.length * 100; // Strongly prefer UTF-8
            } else {
              score += cyrillicChars.length; // Other encodings score low
            }
          }
        }

        // Check for common CSV separators and newlines
        if (text.includes(',') || text.includes('\n')) {
          score += 5;
        }

        // Check for typical CSV content (digits, letters, etc.)
        const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
        score += alphanumericCount;

        // Keep the highest-scoring decode result
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

  // Return the best successful decode
  if (bestResult) {
    return bestResult;
  }

  // Fall back to UTF-8 if all encodings fail
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(arrayBuffer);
};

/**
 * Hook to fetch content from a URL
 * @param url URL to fetch
 * @param options Options
 * @returns Data, loading/error state, and a manual fetch method
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

  // Fetch content
  const fetchContent = useCallback(
    async (targetUrl?: string) => {
      // Return cached content when available
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
        // Fetch URL content when not cached
        const response = await fetch(targetUrl);
        if (response.ok) {
          // Read response encoding from content-type
          const contentTypeHeader = contentType || response.headers.get('content-type') || '';
          const arrayBuffer = await response.arrayBuffer();

          // Detect file type from ArrayBuffer
          const detectedType = detectFileType(arrayBuffer);

          // Use smarter encoding handling for CSV
          let text: string;
          if (contentTypeHeader.includes('text/csv') || targetUrl?.endsWith('.csv')) {
            // Decode via ArrayBuffer
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

          // Cache content
          cache.set(targetUrl, text);
          // Cache file type
          cacheFileType.set(targetUrl, detectedType);

          // Update state
          setState({
            data: text,
            fileType: detectedType,
            blobUrl,
            loading: false,
            error: null,
          });
        } else {
          // Update state
          setState({
            data: null,
            fileType: '',
            blobUrl: '',
            loading: false,
            error: `HTTP error: ${response.status} ${response.statusText}`,
          });
        }
      } catch (error) {
        // Catch all errors (network, decode, etc.)
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

  // Auto-fetch content
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
