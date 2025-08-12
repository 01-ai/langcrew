import { MessageToolChunk } from '@/types';
import { isJsonString } from '@/utils/json';

const useToolContent = (message: MessageToolChunk) => {
  const content = message.detail?.result?.content || '';
  if (isJsonString(content)) {
    const json = JSON.parse(content);
    if (json.content && json.content_type) {
      return {
        content: json.content,
        contentType: json.content_type,
      };
    }
  }
  return {
    content,
    contentType: '',
  };
};

export default useToolContent;
