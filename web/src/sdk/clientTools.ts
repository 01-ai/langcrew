// ============================================================
// Client Tool SDK
// ============================================================

import type { ClientToolCallChunk } from '@/types';

export interface ClientToolHandlerContext {
  arguments: Record<string, unknown>;
  chunk: ClientToolCallChunk;
  agentId: string;
  sessionId: string;
  signal: AbortSignal;
}

/** @deprecated Please use ClientToolHandlerContext。 */
export type ClientToolHandlerArgs = ClientToolHandlerContext;

export interface ClientToolResult {
  success: boolean;
  data: Record<string, unknown>;
}

export type ClientToolHandler = (
  context: ClientToolHandlerContext,
) => Promise<Record<string, unknown>> | Record<string, unknown>;

export type ClientToolHandlers = Record<string, ClientToolHandler>;

export interface ClientToolResultContext extends ClientToolHandlerContext {
  result: ClientToolResult;
}

export interface ExecuteClientToolCallOptions {
  handler?: ClientToolHandler;
  agentId?: string;
  sessionId?: string;
  signal?: AbortSignal;
}

const toolRegistry = new Map<string, ClientToolHandler>();

// Register a client tool
export function registerClientTool(name: string, handler: ClientToolHandler): void {
  toolRegistry.set(name, handler);
}

// Unregister a client tool
export function unregisterClientTool(name: string): void {
  toolRegistry.delete(name);
}

// Clear all client tools
export function clearClientTools(): void {
  toolRegistry.clear();
}

export async function executeClientToolCall(
  chunk: ClientToolCallChunk,
  options: ExecuteClientToolCallOptions = {},
): Promise<ClientToolResult> {
  const toolName = chunk.detail.name;
  const args = chunk.detail.arguments;
  const handler = options.handler ?? toolRegistry.get(toolName);

  if (!handler) {
    return {
      success: false,
      data: { message: `Unknown client tool: ${toolName}` },
    };
  }

  try {
    const data = await handler({
      arguments: args,
      chunk,
      agentId: options.agentId ?? '',
      sessionId: options.sessionId ?? chunk.session_id ?? '',
      signal: options.signal ?? new AbortController().signal,
    });
    return {
      success: true,
      data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Client tool error';

    return {
      success: false,
      data: { message },
    };
  }
}
