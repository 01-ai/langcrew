import { MessageChunk } from '@/types';
import { FAKE_CHUNK_PREFIX } from './constants';

/**
 * Whether this is a fake status chunk (id is not recognized by the server)
 * @param chunk Message chunk
 * @returns whether this is a fake chunk
 */
export const isFakeChunk = (chunk: MessageChunk): boolean => {
  if (!chunk?.id) return true;
  return String(chunk.id).startsWith(FAKE_CHUNK_PREFIX);
};

// Filter unused chunks such as live_status
export const isUselessChunk = (chunk: MessageChunk): boolean => {
  return chunk.type === 'live_status' || chunk.role === 'inner_message';
};

/**
 * Drop fake chunks and return real ones
 * @param chunks Message chunk list
 * @returns real chunks after filtering
 */
export const filterFakeChunks = (chunks: MessageChunk[]): MessageChunk[] => {
  return chunks.filter((chunk) => !isFakeChunk(chunk) && !isUselessChunk(chunk));
};
