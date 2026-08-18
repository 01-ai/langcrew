import { useCallback, useMemo, MutableRefObject } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getCommonRequestHeaders } from '@/services/request';
import { createLangCrewChatTransport } from '@/services/chatTransport';
import {
  findInterruptDataChunk,
  RETRY_DELAY,
  FAKE_CHUNK_PREFIX,
  filterFakeChunks,
  FAKE_USER_MESSAGE_PREFIX,
} from '../utils';
import type { SendOptions } from '../index';
import { useAgentStore, useRequestClient } from '@/store';
import type { HitlApprovalResumeContent } from '@/types';

type ChatRequestState = {
  requestConfig?: {
    extraHeaders?: Record<string, string>;
  };
};

interface UseSendProps {
  sessionIdRef: MutableRefObject<string>;
  currentMessageRef: MutableRefObject<string>;
  retryTimerRef: MutableRefObject<number | null>;
  storeApi: ReturnType<typeof import('@/store').useAgentStoreApi>;
  handleResponse: (response: Response, onTimeout: () => void, onComplete: () => void) => Promise<void>;
  sendContinue: (retryCount: number) => Promise<void>;
  onSendComplete: () => void;
  enableSendContinue: boolean;
  markSessionCreated?: (sessionId: string, initialTitle: string) => void;
}

const isHitlApprovalResumeContent = (content: unknown): content is HitlApprovalResumeContent => {
  return (
    Boolean(content) &&
    typeof content === 'object' &&
    Array.isArray((content as HitlApprovalResumeContent).decisions)
  );
};

/**
 * send() logic
 * Send messages and handle SSE responses
 */
export const useSend = ({
  sessionIdRef,
  currentMessageRef,
  retryTimerRef,
  storeApi,
  handleResponse,
  sendContinue,
  onSendComplete,
  enableSendContinue,
  markSessionCreated,
}: UseSendProps) => {
  const { t } = useTranslation();
  const requestClient = useRequestClient();
  const {
    chatEndpoint,
    sessionInfo: { session_id: storeSessionId } = {},
    showSenderActions,
  } = useAgentStore();
  const transport = useMemo(
    () => createLangCrewChatTransport({ endpoint: chatEndpoint }),
    [chatEndpoint],
  );

  const send = useCallback(
    async ({
      content,
      files = [],
      knowledgeBases = [],
      type,
      params,
      resumeContent,
      generalAgentMode: paramGeneralAgentMode,
      options: paramOptions,
      metadata,
      mentions,
    }: SendOptions) => {
      // Prefer store values; fall back to the argument
      const generalAgentMode = storeApi.getState().generalAgentMode || paramGeneralAgentMode;
      const storeOptions = storeApi.getState().deepResearchOptions;
      const options = {
        ...((storeOptions && typeof storeOptions === 'object' ? storeOptions : {}) as Record<string, any>),
        ...((paramOptions && typeof paramOptions === 'object' ? paramOptions : {}) as Record<string, any>),
      };
      const requestMetadata = metadata ?? storeApi.getState().senderMetadata;
      // May also send a server action or client tool result
      const isSendMessage = !!content;
      let currentSessionId = storeSessionId || sessionIdRef.current;

      if (
        storeApi.getState().senderSending &&
        isSendMessage &&
        !transport.capabilities.addMessageWhileStreaming
      ) {
        return;
      }

      if (!currentSessionId && requestClient.capabilities().sessionRest) {
        const selectedSenderModels = storeApi.getState().selectedSenderModels;
        let model;
        if (selectedSenderModels && selectedSenderModels.length > 0) {
          const currentModel = selectedSenderModels[0];
          model = {
            id: currentModel.id,
            model_display_name: currentModel.model_display_name,
          };
        }

        const session = await requestClient.createSession({
          content: typeof content === 'string' ? content : '',
          knowledge_ids: knowledgeBases.map((item) => item.knowledge_id),
          super_employee_id: storeApi.getState().agentId || undefined,
          mode: storeApi.getState().sessionMode,
          model,
          showSenderActions,
        });
        currentSessionId = session.session_id;
        storeApi.getState().setSessionInfo(session);
        storeApi.getState().setChunks([]);
        storeApi.getState().setPreviousSessionId(currentSessionId);
        storeApi.getState().setSessionId(currentSessionId);
        sessionIdRef.current = currentSessionId;
        markSessionCreated?.(session.session_id, session.title ?? '');

        try {
          await storeApi.getState().onSessionCreated?.(session);
        } catch (error) {
          console.error('onSessionCreated callback failed:', error);
        }
      }

      if (type === 'client_tool_result') {
        storeApi.getState().setPendingClientToolResult(false);
      }

      storeApi.getState().setSenderLoading(true);

      try {
        const pipelineMessages = storeApi.getState().pipelineMessages;
        // Get the last message with interrupt_data
        const interruptDataChunk = findInterruptDataChunk(pipelineMessages[pipelineMessages.length - 1]);
        const interruptData = interruptDataChunk?.detail?.interrupt_data;
        const effectiveResumeContent = resumeContent;
        const rawRequestContent = effectiveResumeContent ?? content;
        const requestContent =
          typeof rawRequestContent === 'string' ||
          rawRequestContent === undefined ||
          isHitlApprovalResumeContent(rawRequestContent)
            ? rawRequestContent
            : JSON.stringify(rawRequestContent);
        // Get the previous message
        const previousMessage = pipelineMessages[pipelineMessages.length - 2]?.messages?.[0];
        const shouldForwardOriginalInterruptData =
          interruptData?.type === 'user_input' ||
          interruptData?.type === 'dynamic_form' ||
          Boolean(interruptData?.question_type || interruptData?.form_schema || interruptData?.action_requests);

        if (isSendMessage) {
          // Keep the current message so send can resume after abort
          currentMessageRef.current = content;
          // Append the user message to chunks
          storeApi.getState().addChunk({
            // No FAKE_CHUNK_PREFIX; this stays because the server never echoes it
            id: FAKE_USER_MESSAGE_PREFIX + Date.now().toString(),
            type: 'text',
            role: 'user',
            content,
            timestamp: Date.now(),
            detail: {
              attachments: files.map((item) => ({
                filename: item.name,
                path: item.key,
                url: item.url,
                size: item.size,
                content_type: item.type,
                show_user: 1,
              })),
              ...(mentions && mentions.length > 0 && { mentions }),
            },
            ...(requestMetadata !== undefined && { metadata: requestMetadata }),
          });
        }

        if (type === 'custom_action') {
          storeApi.getState().addChunk({
            // No FAKE_CHUNK_PREFIX; this stays because the server never echoes it
            id: Date.now().toString(),
            type: 'text',
            role: 'user',
            content: '',
            timestamp: Date.now(),
          });
        }

        // Abort the previous request safely
        try {
          storeApi.getState().abortController?.abort();
        } catch (e) {
          // abort may throw; ignore it
        }
        const abortController = new AbortController();
        storeApi.getState().setAbortController(abortController);
        storeApi.getState().setSenderSending(true);

        // Read the selected model from the store
        const selectedSenderModels = storeApi.getState().selectedSenderModels;

        // Build the model object
        let model;
        if (selectedSenderModels && selectedSenderModels.length > 0) {
          const currentModel = selectedSenderModels[0];
          model = {
            id: currentModel.id,
            model_display_name: currentModel.model_display_name,
          };
        }

        const requestBody = {
          ...(currentSessionId ? { session_id: currentSessionId } : {}),
          // If a chunk has interrupt_data, copy detail.interrupt_data onto body
          ...(interruptData
            ? {
                interrupt_data: shouldForwardOriginalInterruptData
                  ? interruptData
                  : {
                      ...interruptData,
                      content: previousMessage?.content,
                      files: previousMessage?.detail?.attachments || previousMessage?.detail?.files,
                    },
              }
            : {}),
          ...(showSenderActions
            ? {
                knowledge_query_request: {
                  knowledge_ids: knowledgeBases ? knowledgeBases.map((kb) => kb.knowledge_id) : [],
                },
              }
            : {}),
          ...(!isSendMessage
            ? {
                type,
                params,
              }
            : {
                ...(isHitlApprovalResumeContent(requestContent) ? { type: 'user_message' } : {}),
                message: requestContent,
                files,
                ...(mentions && mentions.length > 0 && { mentions }),
                ...(requestMetadata !== undefined && { metadata: requestMetadata }),
                mock: false,
                model,
                general_agent_mode: generalAgentMode || undefined,
                ...(Object.keys(options).length > 0 && { options }),
              }),
        };

        const response = await transport.send({
          body: requestBody,
          headers: getCommonRequestHeaders(
            {
              accept: 'text/event-stream',
              'Content-Type': 'application/json',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            (storeApi.getState() as ChatRequestState).requestConfig?.extraHeaders,
          ),
          signal: abortController.signal,
        });
        storeApi.getState().setSenderLoading(false);

        if (!response.ok) {
          throw new Error('Failed to fetch');
        }

        handleResponse(
          response,
          () => {
            console.log('[useSend] onTimeout callback triggered');
            if (enableSendContinue) {
              // Clear previous fake messages first
              storeApi.getState().setChunks(filterFakeChunks(storeApi.getState().chunks));
              storeApi.getState().addChunk({
                id: `${FAKE_CHUNK_PREFIX}retry-${Date.now()}`,
                role: 'assistant',
                type: 'live_status',
                content: t('chatbot.task.server.reconnecting', { current: 1, max: 30 }),
              });
              console.log('[useSend] will call sendContinue');
              sendContinue(0);
            } else {
              console.log('[useSend] send-continue disabled, skip');
              onSendComplete();
            }
          },
          onSendComplete,
        );
      } catch (error) {
        storeApi.getState().setSenderLoading(false);
        storeApi.getState().setSenderSending(false);
        // AbortError means the user cancelled; do not show an error
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Request was aborted in send');
          return;
        }

        console.error('Send error:', error);

        // Check network status
        if (!navigator.onLine) {
          // Offline: notify the user; do not auto-continue
          console.log('Network is offline');
          // Clear previous fake messages first
          storeApi.getState().setChunks(filterFakeChunks(storeApi.getState().chunks));
          storeApi.getState().addChunk({
            id: `${FAKE_CHUNK_PREFIX}offline-${Date.now()}`,
            role: 'assistant',
            type: 'live_status',
            content: t('chatbot.task.network.offline'),
          });
          // Do not schedule retry; wait for the user to resend
          return;
        }

        // Clear previous fake messages first
        storeApi.getState().setChunks(filterFakeChunks(storeApi.getState().chunks));
        storeApi.getState().addChunk({
          id: `${FAKE_CHUNK_PREFIX}retry-${Date.now()}`,
          role: 'assistant',
          type: 'live_status',
          content: t('chatbot.task.server.reconnecting', { current: 1, max: 30 }),
        });

        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }

        if (enableSendContinue) {
          retryTimerRef.current = window.setTimeout(() => {
            console.log('[useSend] Retry timer fired, calling sendContinue');
            sendContinue(0);
          }, RETRY_DELAY) as any;
        } else {
          console.log('[useSend] send-continue disabled, skip retry');
          onSendComplete();
        }
      }
    },
    [
      storeApi,
      sessionIdRef,
      transport,
      showSenderActions,
      storeSessionId,
      handleResponse,
      onSendComplete,
      currentMessageRef,
      enableSendContinue,
      t,
      sendContinue,
      retryTimerRef,
      requestClient,
      markSessionCreated,
    ],
  );

  return {
    send,
  };
};
