// ============================================================
// Client Tool SDK - Type Declarations Only
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

export function registerClientTool(name: string, handler: ClientToolHandler): void;
export function unregisterClientTool(name: string): void;
export function clearClientTools(): void;
export function executeClientToolCall(
  chunk: ClientToolCallChunk,
  options?: ExecuteClientToolCallOptions,
): Promise<ClientToolResult>;
