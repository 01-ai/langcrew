import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequestClient } from './requestClient';

const requestMocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('./request', () => ({
  http: {
    post: requestMocks.post,
  },
  buildAxiosRequestConfig: (headers: Record<string, string>, config: object) => ({
    ...config,
    extraHeaders: headers,
  }),
  getCommonRequestHeaders: (
    additional?: Record<string, string>,
    extra?: Record<string, string>,
  ) => ({ ...extra, ...additional }),
}));

const createStore = (requestConfig: Record<string, unknown> = {}) => ({
  getState: () => ({ requestConfig }),
});

describe('createRequestClient', () => {
  beforeEach(() => {
    requestMocks.post.mockReset();
    requestMocks.post.mockResolvedValue({ code: 0, data: null, message: '' });
  });

  it('uses the open-source stop and update endpoints by default', async () => {
    const client = createRequestClient(
      createStore({ extraHeaders: { Authorization: 'test-token' } }),
    );

    await client.session.stopTask('session-1');
    await client.session.addNewMessage('session-1', 'next', [], undefined);

    expect(requestMocks.post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/chat/stop',
      { session_id: 'session-1' },
      expect.objectContaining({ extraHeaders: { Authorization: 'test-token' } }),
    );
    expect(requestMocks.post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/update_task',
      { session_id: 'session-1', message: 'next' },
      expect.any(Object),
    );
  });

  it('does not enable managed sessions without an explicit adapter', async () => {
    const client = createRequestClient(createStore());
    await expect(client.getSession('session-1')).rejects.toMatchObject({
      code: 'AGENTX_CAPABILITY_UNAVAILABLE',
    });
    await expect(
      client.createSession({ content: 'hello', knowledge_ids: [] }),
    ).rejects.toMatchObject({
      code: 'AGENTX_CAPABILITY_UNAVAILABLE',
    });
  });

  it('delegates managed sessions only when the capability is enabled', async () => {
    const getSession = vi.fn().mockResolvedValue({
      session_info: { session_id: 'session-1', title: 'Session', status: 'ACTIVE' },
      messages: [],
    });
    const client = createRequestClient(
      createStore({
        capabilities: { sessionRest: true },
        adapter: { getSession },
      }),
    );

    await client.getSession('session-1');
    expect(getSession).toHaveBeenCalledWith('session-1', {});
  });
});
