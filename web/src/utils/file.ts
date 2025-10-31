/**
 * 计算文件的哈希值
 * 由于Web Crypto API不支持MD5，这里计算SHA-256作为替代
 *
 * @param file 文件对象
 * @returns Promise<string> 文件的哈希值
 */
export async function calculateHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 生成安全的 UID
 * @returns 唯一的标识符
 */
export function generateSecureUid(): string {
  // 使用 crypto.randomUUID 如果有的话，否则使用时间戳 + 随机数
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 从文件名获取文件扩展名
 * @param fileName 文件名
 * @returns 文件扩展名（包含点号，如 ".pdf"）
 */
export function getFileExtensionFromFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  }
  return fileName.substring(lastDotIndex);
}
