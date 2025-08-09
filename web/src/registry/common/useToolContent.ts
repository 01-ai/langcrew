import { MessageToolChunk } from '@/types';

const useToolContent = (message: MessageToolChunk) => {
  const content = message.detail?.result?.content || '';
  return content;
};

export default useToolContent;
