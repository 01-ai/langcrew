import { MessageToolChunk } from '@/types';
import { isJsonString } from '@/utils/json';

const useToolContent = (message: MessageToolChunk) => {
  const result = message.detail?.result;
  // New schema: tool-specific content is in result.artifact, result.content is a summary string
  // Old schema: tool-specific content is directly in result.content
  const content = result?.artifact ?? result?.content ?? '';
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
