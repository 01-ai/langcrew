export interface ChatTransportCapabilities {
  sendContinue: boolean;
  sessionHistory: boolean;
  createSessionViaRest: boolean;
  addMessageWhileStreaming: boolean;
}

export interface ChatSendRequest {
  body: Record<string, unknown>;
  headers: HeadersInit;
  signal: AbortSignal;
}

export interface ChatStopRequest {
  sessionId: string;
  headers: HeadersInit;
  signal?: AbortSignal;
}

export interface ChatTransport {
  readonly capabilities: Readonly<ChatTransportCapabilities>;
  send(request: ChatSendRequest): Promise<Response>;
  stop(request: ChatStopRequest): Promise<Response>;
}
