import { useState, useEffect, useCallback } from 'react';

export interface UrlContentState {
  data: string | null;
  fileType: string;
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
}

// 文件类型检测配置
const FILE_SIGNATURES = {
  // Office文档
  docx: [0x50, 0x4b, 0x03, 0x04], // DOCX (ZIP based)
  xlsx: [0x50, 0x4b, 0x03, 0x04], // XLSX (ZIP based)
  pptx: [0x50, 0x4b, 0x03, 0x04], // PPTX (ZIP based)

  // PDF
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF

  // 压缩文件
  zip: [0x50, 0x4b, 0x03, 0x04], // ZIP
  rar: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07], // RAR
  gz: [0x1f, 0x8b], // GZIP
};

/**
 * 检测ArrayBuffer的文件类型
 * @param buffer ArrayBuffer
 * @returns 文件类型字符串
 */
const detectFileType = (buffer: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(buffer);

  // 对于ZIP格式的文件（docx、xlsx、pptx），需要进一步区分
  if (matchesSignature(uint8Array, FILE_SIGNATURES.zip)) {
    // 检查ZIP文件内容来区分Office文档类型
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
 * 检查字节数组是否匹配文件签名
 * @param uint8Array 字节数组
 * @param signature 文件签名
 * @returns 是否匹配
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
 * 缓存URL内容
 */
const cache = new Map<string, string>();

/**
 * 缓存URL文件类型
 */
const cacheFileType = new Map<string, string>();

/**
 * 缓存blobUrl
 */
const cacheBlobUrl = new Map<string, string>();

/**
 * 检查文本是否包含乱码
 */
const hasGarbledText = (text: string): boolean => {
  // 检查是否包含常见的乱码字符
  const garbledPatterns = [
    /[\uFFFD]/g, // Unicode替换字符
    /[\u007F-\u009F]/g, // 控制字符
    /[\uFFFE\uFFFF]/g, // Unicode BOM相关
  ];

  return garbledPatterns.some((pattern) => pattern.test(text));
};

/**
 * 检查文本是否包含有效的中文字符
 */
const hasValidChineseText = (text: string): boolean => {
  // 检查是否包含中文字符
  const chinesePattern = /[\u4e00-\u9fa5]/;
  return chinesePattern.test(text);
};

/**
 * 尝试不同的编码格式解码文本
 */
const tryDecodeWithDifferentEncodings = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const encodings = ['utf-8', 'gbk', 'gb2312', 'big5', 'shift-jis'];
  let bestResult = '';
  let bestScore = 0;

  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding);
      const text = decoder.decode(arrayBuffer);

      // 检查解码是否成功
      if (text.length > 0 && !hasGarbledText(text)) {
        let score = 0;

        // 如果包含中文，计算中文质量分数
        if (hasValidChineseText(text)) {
          const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
          if (chineseChars) {
            score += chineseChars.length * 10; // 中文字符越多，分数越高
          }
        }

        // 检查是否包含常见的CSV分隔符和换行符
        if (text.includes(',') || text.includes('\n')) {
          score += 5;
        }

        // 检查是否包含常见的CSV内容（数字、字母等）
        const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
        score += alphanumericCount;

        // 如果这个编码的分数更高，更新最佳结果
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

  // 如果找到了好的结果，返回它
  if (bestResult) {
    return bestResult;
  }

  // 如果所有编码都失败，使用UTF-8作为后备
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(arrayBuffer);
};

/**
 * 从URL获取内容的hook
 * @param url 要获取内容的URL
 * @param options 配置选项
 * @returns 包含数据、加载状态和错误信息的对象，以及手动获取内容的方法
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

  // 获取内容
  const fetchContent = useCallback(
    async (targetUrl?: string) => {
      // 如果缓存中存在，直接返回缓存内容
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
      // 如果缓存中不存在，则请求URL内容
      const response = await fetch(targetUrl);
      if (response.ok) {
        // 获取响应的编码信息
        const contentTypeHeader = contentType || response.headers.get('content-type') || '';
        const arrayBuffer = await response.arrayBuffer();

        // 通过ArrayBuffer检测文件类型
        const detectedType = detectFileType(arrayBuffer);
        console.log('Detected file type:', detectedType);

        // 对于CSV文件，使用更智能的编码处理
        let text: string;
        if (contentTypeHeader.includes('text/csv') || targetUrl?.endsWith('.csv')) {
          // 使用ArrayBuffer来处理编码
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
          // 缓存blobUrl
          cacheBlobUrl.set(targetUrl, blobUrl);
        }

        // 缓存内容
        cache.set(targetUrl, text);
        // 缓存文件类型
        cacheFileType.set(targetUrl, detectedType);

        // 设置状态
        setState({
          data: text,
          fileType: detectedType,
          blobUrl,
          loading: false,
          error: null,
        });
      } else {
        // 设置状态
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

  // 自动获取内容
  useEffect(() => {
    if (url) {
      fetchContent(url);
    }
  }, [url, fetchContent]);

  return {
    ...state,
  };
};
