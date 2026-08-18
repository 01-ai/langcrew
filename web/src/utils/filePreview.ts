import { getFileExtension } from '@/utils/parser';

export const FILE_CONTENT_SUPPORT_FILE_TYPES = ['html', 'htm', 'md', 'csv'];
export const FILE_CONTENT_SUPPORT_CONTENT_TYPES = ['text/html', 'text/markdown', 'text/csv'];

export const OFFICE_FILE_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
export const IMAGE_FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
export const VIDEO_FILE_EXTENSIONS = ['mp4', 'webm', 'ogg'];
export const PDF_FILE_EXTENSION = 'pdf';

const PLAINTEXT_FILE_EXTENSIONS = [
  'txt',
  'log',
  'md',
  'csv',
  'json',
  'xml',
  'yaml',
  'yml',
  'ini',
  'conf',
  'cfg',
  'properties',
  'toml',
];

const CODE_FILE_EXTENSIONS = [
  'js',
  'jsx',
  'ts',
  'tsx',
  'py',
  'sh',
  'bash',
  'htm',
  'html',
  'css',
  'less',
  'scss',
  'json',
  'xml',
  'yaml',
  'yml',
  'ini',
  'conf',
  'cfg',
  'properties',
  'toml',
];

const CODE_LIKE_CONTENT_TYPES = ['application/json', 'application/xml', 'application/javascript'];

const OFFICE_CONTENT_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const DETECTED_OFFICE_FILE_TYPES = ['docx', 'xlsx', 'pptx'];

export interface CanPreviewFileOptions {
  url?: string;
  filename?: string;
  contentType?: string;
  /**
   * Type from magic bytes; only after content is fetched.
   */
  detectedFileType?: string;
}

export function resolvePreviewFileExtension(options: CanPreviewFileOptions): string {
  return getFileExtension(options.url) || getFileExtension(options.filename) || '';
}

function isRenderableContentType(contentType?: string): boolean {
  const normalizedContentType = contentType?.toLowerCase() || '';

  return (
    normalizedContentType.startsWith('text/') ||
    FILE_CONTENT_SUPPORT_CONTENT_TYPES.some((supportedType) => normalizedContentType.includes(supportedType)) ||
    CODE_LIKE_CONTENT_TYPES.some((supportedType) => normalizedContentType.includes(supportedType))
  );
}

export function isImagePreviewFile(ext: string, contentType?: string): boolean {
  const normalizedContentType = contentType?.toLowerCase() || '';

  return (
    IMAGE_FILE_EXTENSIONS.includes(ext) ||
    ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'].includes(normalizedContentType) ||
    normalizedContentType.startsWith('image/')
  );
}

export function resolveOfficeFileTypeFromContentType(contentType?: string): string | null {
  const normalizedContentType = contentType?.toLowerCase() || '';

  if (normalizedContentType.includes('wordprocessingml')) {
    return 'docx';
  }
  if (normalizedContentType.includes('spreadsheetml')) {
    return 'xlsx';
  }
  if (normalizedContentType.includes('presentationml')) {
    return 'pptx';
  }

  return null;
}

export function isOfficePreviewFile(ext: string, contentType?: string, detectedFileType?: string): boolean {
  const normalizedContentType = contentType?.toLowerCase() || '';
  const normalizedDetectedType = detectedFileType?.toLowerCase() || '';

  return (
    OFFICE_FILE_EXTENSIONS.includes(ext) ||
    OFFICE_CONTENT_TYPES.some((type) => normalizedContentType.includes(type)) ||
    DETECTED_OFFICE_FILE_TYPES.includes(normalizedDetectedType)
  );
}

export function isPdfPreviewFile(ext: string, contentType?: string, detectedFileType?: string): boolean {
  const normalizedContentType = contentType?.toLowerCase() || '';
  const normalizedDetectedType = detectedFileType?.toLowerCase() || '';

  return ext === PDF_FILE_EXTENSION || normalizedContentType.includes('application/pdf') || normalizedDetectedType === 'pdf';
}

export function isVideoPreviewFile(ext: string, contentType?: string): boolean {
  const normalizedContentType = contentType?.toLowerCase() || '';

  return VIDEO_FILE_EXTENSIONS.includes(ext) || normalizedContentType.startsWith('video/');
}

export function isTextPreviewFile(ext: string, contentType?: string): boolean {
  return (
    FILE_CONTENT_SUPPORT_FILE_TYPES.includes(ext) ||
    PLAINTEXT_FILE_EXTENSIONS.includes(ext) ||
    CODE_FILE_EXTENSIONS.includes(ext) ||
    isRenderableContentType(contentType)
  );
}

/**
 * Sync check that a file can be previewed; same whitelist as FileReader.
 * Uses extension and MIME; suffix-less files may be false until content is fetched (FileReader / detectedFileType).
 */
export function canPreviewFile(options: CanPreviewFileOptions): boolean {
  const ext = resolvePreviewFileExtension(options);

  return (
    isImagePreviewFile(ext, options.contentType) ||
    isOfficePreviewFile(ext, options.contentType, options.detectedFileType) ||
    isPdfPreviewFile(ext, options.contentType, options.detectedFileType) ||
    isVideoPreviewFile(ext, options.contentType) ||
    isTextPreviewFile(ext, options.contentType)
  );
}

/**
 * Whether to fetch content before preview (text, PDF blob, magic-byte detect).
 * Internal to FileReader; not exported.
 */
export function shouldFetchFileContentForPreview(options: CanPreviewFileOptions): boolean {
  const ext = resolvePreviewFileExtension(options);

  if (OFFICE_FILE_EXTENSIONS.includes(ext)) {
    return false;
  }

  if (!ext && isOfficePreviewFile('', options.contentType)) {
    return false;
  }

  if (isImagePreviewFile(ext, options.contentType) || isVideoPreviewFile(ext, options.contentType)) {
    return false;
  }

  if (ext && !canPreviewFile(options)) {
    return false;
  }

  return true;
}
