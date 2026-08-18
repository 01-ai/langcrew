import { MessageToolChunk } from '@/types';
import { isJsonString } from '@/utils/json';

const getImageUrlFromBlock = (block: any): string | undefined => {
  if (!block) {
    return undefined;
  }

  if (typeof block?.image_url === 'string') {
    return block.image_url;
  }

  if (typeof block?.image_url?.url === 'string') {
    return block.image_url.url;
  }

  return undefined;
};

const parseToolContent = (content?: unknown): Record<string, any> => {
  if (content && typeof content === 'object') {
    return content as Record<string, any>;
  }

  if (typeof content === 'string' && isJsonString(content)) {
    return JSON.parse(content);
  }

  return {};
};

export const getImageUrlFromToolMessage = (message: MessageToolChunk, content?: unknown): string | undefined => {
  const parsedContent = parseToolContent(content);
  const result = message?.detail?.result as Record<string, any> | undefined;
  const param = message?.detail?.param as Record<string, any> | undefined;

  const contentBlocks =
    result?.update?.messages?.flatMap((toolMessage: any) =>
      Array.isArray(toolMessage?.content) ? toolMessage.content : [toolMessage?.content].filter(Boolean),
    ) ?? [];

  const imageBlock = contentBlocks.find((block: any) => !!getImageUrlFromBlock(block));

  return (
    parsedContent?.image_url ||
    parsedContent?.url ||
    result?.image_url ||
    result?.artifact?.image_url ||
    getImageUrlFromBlock(imageBlock) ||
    param?.url
  );
};

export const shouldRenderToolDetailWhilePending = (message?: MessageToolChunk) => {
  if (!message?.type) {
    return false;
  }

  return (
    message.type.startsWith('browser') || message.type === 'image_generation' || message.type === 'view_image_url'
  );
};
