import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLangCrewChatTransport,
  DEFAULT_LANGCREW_CHAT_ENDPOINT,
  DEFAULT_LANGCREW_STOP_ENDPOINT,
  LANGCREW_CHAT_CAPABILITIES,
} from '../langCrew';

describe('LangCrewChatTransport', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response());
  });

  it('explicitly declares no hosted-session capability', () => {
    expect(LANGCREW_CHAT_CAPABILITIES).toEqual({
      sendContinue: false,
      sessionHistory: false,
      createSessionViaRest: false,
      addMessageWhileStreaming: false,
    });
  });

  it('sends a message with the default endpoint, caller headers, and POST', async () => {
    const transport = createLangCrewChatTransport({
      fetch: fetchMock as typeof fetch,
    });
    const signal = new AbortController().signal;
    const headers = {
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    };
    const body = {
      message: 'hello',
      session_id: 'session-1',
    };

    await transport.send({ body, headers, signal });

    expect(fetchMock).toHaveBeenCalledWith(DEFAULT_LANGCREW_CHAT_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  });

  it('supports overriding the message endpoint', async () => {
    const transport = createLangCrewChatTransport({
      endpoint: '/custom/chat',
      fetch: fetchMock as typeof fetch,
    });

    await transport.send({
      body: { message: 'hello' },
      headers: {},
      signal: new AbortController().signal,
    });

    expect(fetchMock).toHaveBeenCalledWith('/custom/chat', expect.any(Object));
  });

  it('sends session_id and caller headers to the default stop endpoint', async () => {
    const transport = createLangCrewChatTransport({
      fetch: fetchMock as typeof fetch,
    });
    const headers = {
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    };

    await transport.stop({
      sessionId: 'session-1',
      headers,
    });

    expect(fetchMock).toHaveBeenCalledWith(DEFAULT_LANGCREW_STOP_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session_id: 'session-1' }),
      signal: undefined,
    });
  });
});
