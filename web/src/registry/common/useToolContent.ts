import { MessageToolChunk } from '@/types';

const useToolContent = (message: MessageToolChunk) => {
  const content = message.detail?.result?.content || '';
  const contentType = message.detail?.result?.content_type || '';
  return {
    content,
    contentType,
  };
};

export default useToolContent;
