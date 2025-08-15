/**
 * 安全地获取文件扩展名
 */
export const getFileExtension = (urlOrPath?: string): string => {
  if (!urlOrPath) return '';
  const parts = urlOrPath.split('/').pop()?.split('.');
  // 如果只有一个部分（没有点），返回空字符串
  if (parts.length <= 1) return '';
  // 返回最后一个部分作为扩展名
  return parts[parts.length - 1].toLowerCase();
};
