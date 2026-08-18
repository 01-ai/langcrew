import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientToolCallChunk } from '@/types';
import {
  clearClientTools,
  executeClientToolCall,
  registerClientTool,
} from './clientTools';

const chunk: ClientToolCallChunk = {
  id: 'tool-chunk',
  role: 'assistant',
  type: 'client_tool_call',
  content: '',
  session_id: 'chunk-session',
  detail: {
    call_id: 'call-1',
    name: 'example',
    arguments: { value: 1 },
    status: 'pending',
    wait_for_result: true,
  },
};

describe('clientTools', () => {
  beforeEach(() => {
    clearClientTools();
  });

  it('passes full generic context to the global handler', async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true });
    const controller = new AbortController();
    registerClientTool('example', handler);

    await expect(
      executeClientToolCall(chunk, {
        agentId: 'agent-1',
        sessionId: 'session-1',
        signal: controller.signal,
      }),
    ).resolves.toEqual({ success: true, data: { ok: true } });

    expect(handler).toHaveBeenCalledWith({
      arguments: { value: 1 },
      chunk,
      agentId: 'agent-1',
      sessionId: 'session-1',
      signal: controller.signal,
    });
  });

  it('instance handler overrides the global registry', async () => {
    const globalHandler = vi.fn().mockReturnValue({ source: 'global' });
    const instanceHandler = vi.fn().mockReturnValue({ source: 'instance' });
    registerClientTool('example', globalHandler);

    await expect(executeClientToolCall(chunk, { handler: instanceHandler })).resolves.toEqual({
      success: true,
      data: { source: 'instance' },
    });
    expect(instanceHandler).toHaveBeenCalledOnce();
    expect(globalHandler).not.toHaveBeenCalled();
  });

  it('converts handler exceptions into a failed result', async () => {
    registerClientTool('example', () => {
      throw new Error('boom');
    });

    await expect(executeClientToolCall(chunk)).resolves.toEqual({
      success: false,
      data: { message: 'boom' },
    });
  });
});
