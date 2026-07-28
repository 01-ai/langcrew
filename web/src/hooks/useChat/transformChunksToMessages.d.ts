// ============================================================
// Client - transformChunksToMessages
// ============================================================

import { MessageChunk, MessageItem } from '@/types';

export function transformChunksToMessages(chunks: MessageChunk[], existingMessages: MessageItem[]): MessageItem[];
