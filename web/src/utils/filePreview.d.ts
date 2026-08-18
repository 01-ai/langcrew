export declare const FILE_CONTENT_SUPPORT_FILE_TYPES: string[];
export declare const FILE_CONTENT_SUPPORT_CONTENT_TYPES: string[];
export declare const OFFICE_FILE_EXTENSIONS: string[];
export declare const IMAGE_FILE_EXTENSIONS: string[];
export declare const VIDEO_FILE_EXTENSIONS: string[];
export declare const PDF_FILE_EXTENSION = "pdf";

export interface CanPreviewFileOptions {
  url?: string;
  filename?: string;
  contentType?: string;
  /**
   * Type from magic bytes; only after content is fetched.
   */
  detectedFileType?: string;
}

export declare function resolvePreviewFileExtension(options: CanPreviewFileOptions): string;
export declare function isImagePreviewFile(ext: string, contentType?: string): boolean;
export declare function resolveOfficeFileTypeFromContentType(contentType?: string): string | null;
export declare function isOfficePreviewFile(ext: string, contentType?: string, detectedFileType?: string): boolean;
export declare function isPdfPreviewFile(ext: string, contentType?: string, detectedFileType?: string): boolean;
export declare function isVideoPreviewFile(ext: string, contentType?: string): boolean;
export declare function isTextPreviewFile(ext: string, contentType?: string): boolean;
/**
 * Sync check that a file can be previewed; same whitelist as FileReader.
 * Uses extension and MIME; suffix-less files may be false until content is fetched (FileReader / detectedFileType).
 */
export declare function canPreviewFile(options: CanPreviewFileOptions): boolean;
/**
 * Whether to fetch content before preview (text, PDF blob, magic-byte detect).
 * Internal to FileReader; not exported.
 */
export declare function shouldFetchFileContentForPreview(options: CanPreviewFileOptions): boolean;
