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
   * The type detected by the file magic is only available when the file content has been pulled.
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
 * Synchronizes whether the file supports online previews and FileReader The white list is consistent.
 * Reliance Extensions and MIME；Unsuffended files may return before ripping content false，Need to combine FileReader or detectedFileType Use.
 */
export declare function canPreviewFile(options: CanPreviewFileOptions): boolean;
/**
 * Whether the contents of the document need to be drawn before preview (text rendering,PDF blob、No Post-Suffix Number Test.
 * FileReader Internal use, no external exposure.
 */
export declare function shouldFetchFileContentForPreview(options: CanPreviewFileOptions): boolean;
