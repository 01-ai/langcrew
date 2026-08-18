import type { ChatTransport, ChatTransportCapabilities } from './types';

export const DEFAULT_LANGCREW_CHAT_ENDPOINT = '/api/v1/chat';
export const DEFAULT_LANGCREW_STOP_ENDPOINT = '/api/v1/chat/stop';

export const LANGCREW_CHAT_CAPABILITIES: Readonly<ChatTransportCapabilities> = Object.freeze({
  sendContinue: false,
  sessionHistory: false,
  createSessionViaRest: false,
  addMessageWhileStreaming: false,
});

export interface LangCrewChatTransportOptions {
  endpoint?: string;
  stopEndpoint?: string;
  fetch?: typeof globalThis.fetch;
}

export const createLangCrewChatTransport = ({
  endpoint = DEFAULT_LANGCREW_CHAT_ENDPOINT,
  stopEndpoint = DEFAULT_LANGCREW_STOP_ENDPOINT,
  fetch: fetchImpl = globalThis.fetch,
}: LangCrewChatTransportOptions = {}): ChatTransport => ({
  capabilities: LANGCREW_CHAT_CAPABILITIES,

  send: ({ body, headers, signal }) =>
    fetchImpl(endpoint || DEFAULT_LANGCREW_CHAT_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    }),

  stop: ({ sessionId, headers, signal }) =>
    fetchImpl(stopEndpoint || DEFAULT_LANGCREW_STOP_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session_id: sessionId }),
      signal,
    }),
});
