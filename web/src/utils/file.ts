export const calculateHash = (
  chunkList: {
    chunk: Blob;
  }[],
): Promise<string> => {
  return new Promise((resolve) => {
    const worker: Worker = new Worker('/hashWorker.js');
    worker.postMessage({ chunkList: chunkList });
    worker.onmessage = (e) => {
      const { hash } = e.data;
      if (hash) {
        resolve(hash);
      }
    };
  });
};

const CHUNK_SIZE = 1 * 1024 * 1024;

// 拆分文件
export const splitFile = (file: File, size = CHUNK_SIZE) => {
  const fileChunkList = [];
  let curChunkIndex = 0;
  while (curChunkIndex <= file.size) {
    const chunk = file.slice(curChunkIndex, curChunkIndex + size);
    fileChunkList.push({ chunk: chunk });
    curChunkIndex += size;
  }
  return fileChunkList;
};

/**
 * 生成唯一标识符
 * 格式: chat-uid-{时间戳36进制}-{随机字符串}
 * @param prefix 可选的前缀，默认为 'chat-uid'
 * @returns 唯一标识符字符串
 */
const generateUid = (prefix: string = 'chat-uid'): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 11);
  return `${prefix}-${timestamp}-${randomStr}`;
};

/**
 * 使用现代浏览器API生成更安全的uid (备选方案)
 * @param prefix 可选的前缀，默认为 'chat-uid'
 * @returns 唯一标识符字符串
 */
export const generateSecureUid = (prefix: string = 'chat-uid'): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  // 降级到原有方案
  return generateUid(prefix);
};

export const uploadFileUrl = () => {
  const uploadUrl = 'https://console-boe.lingyiwanwu.net/tobg-chatpdf';
  const origin = window.location.origin;
  if (process.env.NODE_ENV === 'production') {
    return `${
      origin === 'https://console-boe.lingyiwanwu.net' ? uploadUrl : 'https://app.lingyiwanwu.net/tobg-chatpdf-prod'
    }`;
  } else {
    return uploadUrl;
  }
};
