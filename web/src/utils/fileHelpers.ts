/**
 * File utility functions for formatting and handling file data
 */

/**
 * Format file size to human-readable format
 */
export const formatSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Check if file is PDF
 */
export const isPdfFile = (filename: string): boolean => {
  return filename.toLowerCase().endsWith('.pdf');
};

/**
 * Check if file is document
 */
export const isDocumentFile = (filename: string): boolean => {
  return /\.(md|doc|docx|odt|rtf|pages|ppt|pptx|odp|key|csv|xlsx|xls|ods|numbers|html|htm|pdf|txt|log|json|xml|yaml|yml|ini|conf|cfg|epub|tex|rst)$/i.test(filename);
};

/**
 * Check if file is image
 */
export const isImageFile = (filename: string): boolean => {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico|bmp|tiff|tif|heic|heif)$/i.test(filename);
};



