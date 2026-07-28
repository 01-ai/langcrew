import { MessageChunk } from '@/types';
import { FAKE_CHUNK_PREFIX } from './constants';

/**
 * Check whether a chunk is a temporary status chunk identified by its ID prefix.
 * @param chunk Message chunk.
 * @returns Whether the chunk is temporary.
 */
export const isFakeChunk = (chunk: MessageChunk): boolean => {
  if (!chunk?.id) return true;
  return String(chunk.id).startsWith(FAKE_CHUNK_PREFIX);
};

// Temporary chunks such as live_status messages.
export const isUselessChunk = (chunk: MessageChunk): boolean => {
  return chunk.type === 'live_status' || chunk.role === 'inner_message';
};

/**
 * Remove temporary chunks.
 * @param chunks Message chunk list.
 * @returns The remaining real chunks.
 */
export const filterFakeChunks = (chunks: MessageChunk[]): MessageChunk[] => {
  return chunks.filter((chunk) => !isFakeChunk(chunk) && !isUselessChunk(chunk));
};
