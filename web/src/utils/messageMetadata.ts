import type { MessageChunk, MessageMetadata } from '@/types';

type MessageMetadataSource = Pick<MessageChunk, 'metadata' | 'detail'>;

/**
 * Resolve message-level metadata from chunk fields returned by different API shapes.
 * Priority: top-level metadata -> detail.metadata -> detail.reference
 */
export const resolveMessageMetadata = (msg?: MessageMetadataSource): MessageMetadata | undefined => {
  if (!msg) {
    return undefined;
  }

  const reference = msg.metadata?.reference ?? msg.detail?.metadata?.reference ?? msg.detail?.reference;
  const baseMetadata = msg.metadata ?? msg.detail?.metadata;

  if (baseMetadata !== undefined) {
    if (reference !== undefined && baseMetadata.reference === undefined) {
      return { ...baseMetadata, reference };
    }
    return baseMetadata;
  }

  if (reference !== undefined) {
    return { reference };
  }

  return undefined;
};
