import { useCallback, MutableRefObject } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useRequestClient } from '@/store';
import {
  findInterruptDataChunk,
  RETRY_DELAY,
  FAKE_CHUNK_PREFIX,
  filterFakeChunks,
  FAKE_USER_MESSAGE_PREFIX,
} from '../utils';
import type { SendOptions } from '../index';
import { useAgentStore } from '@/store';
import type { HitlApprovalResumeContent } from '@/types';

interface UseSendProps {
  sessionIdRef: MutableRefObject<string>;
  basePathRef: MutableRefObject<string>;
  agentIdRef: MutableRefObject<string>;
  currentMessageRef: MutableRefObject<string>;
  retryTimerRef: MutableRefObject<number | null>;
  storeApi: ReturnType<typeof import('@/store').useAgentStoreApi>;
  handleResponse: (response: Response, onTimeout: () => void, onComplete: () => void) => Promise<void>;
  sendContinue: (retryCount: number) => Promise<void>;
  onSendComplete: () => void;
  enableSendContinue: boolean;
}

const isHitlApprovalResumeContent = (content: unknown): content is HitlApprovalResumeContent => {
  return (
    Boolean(content) &&
    typeof content === 'object' &&
    Array.isArray((content as HitlApprovalResumeContent).decisions)
  );
};

/**
 * Message sending, session creation, and SSE response handling.
 */
export const useSend = ({
  sessionIdRef,
  basePathRef,
  agentIdRef,
  currentMessageRef,
  retryTimerRef,
  storeApi,
  handleResponse,
  sendContinue,
  onSendComplete,
  enableSendContinue,
}: UseSendProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const requestClient = useRequestClient();
  const {
    sessionMode = '',
    chatEndpoint,
    sessionInfo: { session_id: storeSessionId } = {},
    showSenderActions,
  } = useAgentStore();

  const send = useCallback(
    async ({
      content,
      files = [],
      mcpTools = [],
      knowledgeBases = [],
      models = [],
      type,
      params,
      resumeContent,
      generalAgentMode: paramGeneralAgentMode,
      options: paramOptions,
      metadata,
    }: SendOptions) => {
      // Prefer the store value and fall back to the function parameters.
      const generalAgentMode = storeApi.getState().generalAgentMode || paramGeneralAgentMode;
      const storeOptions = storeApi.getState().deepResearchOptions;
      const options = {
        ...((storeOptions && typeof storeOptions === 'object' ? storeOptions : {}) as Record<string, any>),
        ...((paramOptions && typeof paramOptions === 'object' ? paramOptions : {}) as Record<string, any>),
      };
      const requestMetadata = metadata ?? storeApi.getState().senderMetadata;
      // Requests may contain a message, a server action, or a client tool result.
      const isSendMessage = !!content;
      let finalSessionId = sessionIdRef.current;

      // Append a new message to the existing session while another send is in progress.
      if (storeApi.getState().senderSending && isSendMessage) {
        storeApi.getState().setSenderLoading(true);

        try {
          // storeApi.getState().addChunk({
          //   // The FAKE_CHUNK_PREFIX and loading field let useChunkParser replace this temporary chunk.
          //   id: Date.now().toString(),
          //   role: 'user',
          //   type: 'text',
          //   content,
          //   loading: true,
          //   timestamp: Date.now(),
          // });
          if (requestMetadata !== undefined) {
            await requestClient.session.addNewMessage(sessionIdRef.current, content, files, requestMetadata);
          } else {
            await requestClient.session.addNewMessage(sessionIdRef.current, content, files);
          }
        } catch (error) {
          console.error('Failed to add new message:', error);
        } finally {
          storeApi.getState().setSenderLoading(false);
        }
        return;
      }

      // Create a session when neither sessionId nor chatEndpoint is available.
      if (!finalSessionId && !chatEndpoint) {
        // Build the model object.
        let model;
        if (models && models.length > 0) {
          const currentModel = models[0];
          model = {
            id: currentModel.id,
            model_display_name: currentModel.model_display_name,
          };
        }

        const session = await requestClient.createSession({
          content,
          knowledge_ids: knowledgeBases.map((item) => item.knowledge_id),
          agent_tool_items: mcpTools.map((item) => ({
            agent_tool_id: item.agent_tool_id,
            agent_tool_type: item.type,
          })),
          super_employee_id: agentIdRef.current === '01' ? '' : agentIdRef.current,
          mode: sessionMode,
          model,
          showSenderActions,
        });
        finalSessionId = session.session_id;
        storeApi.getState().setSessionInfo(session);
        storeApi.getState().setChunks([]);
        // Mark the session as handled so non-routing store updates do not reload history and interrupt this send.
        storeApi.getState().setPreviousSessionId(finalSessionId);
        // Update the store sessionId before route changes can trigger resetStore.
        storeApi.getState().setSessionId(finalSessionId);
        // Update the ref immediately.
        sessionIdRef.current = finalSessionId;

        try {
          await storeApi.getState().onSessionCreated?.(session);
        } catch (error) {
          console.error('onSessionCreated callback failed:', error);
        }

        if (storeApi.getState().sessionConfig.enableRouting) {
          // Page mode retains the original navigation behavior.
          // Set the navigation flag to avoid an unnecessary reload after the route changes.
          storeApi.getState().setIsNavigating(true);

          // Navigate only after the state is ready.
          navigate(`${basePathRef.current}/${agentIdRef.current}/${finalSessionId}${location.search}`);
        }
      }

      if (type === 'client_tool_result') {
        storeApi.getState().setPendingClientToolResult(false);
      }

      storeApi.getState().setSenderLoading(true);

      try {
        const pipelineMessages = storeApi.getState().pipelineMessages;
        // Find the most recent message containing interrupt_data.
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
        // Load the previous message.
        const previousMessage = pipelineMessages[pipelineMessages.length - 2]?.messages?.[0];
        const shouldForwardOriginalInterruptData =
          interruptData?.type === 'user_input' ||
          interruptData?.type === 'dynamic_form' ||
          Boolean(interruptData?.question_type || interruptData?.form_schema || interruptData?.action_requests);

        if (isSendMessage) {
          // Preserve the current message so sending can resume after an interruption.
          currentMessageRef.current = content;
          // Add a temporary user-message chunk.
          storeApi.getState().addChunk({
            // Prefix the temporary chunk ID so it can be identified later.
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
            },
            ...(requestMetadata !== undefined && { metadata: requestMetadata }),
          });
        }

        if (type === 'custom_action') {
          storeApi.getState().addChunk({
            // Prefix the temporary chunk ID so it can be identified later.
            id: Date.now().toString(),
            type: 'text',
            role: 'user',
            content: '',
            timestamp: Date.now(),
          });
        }

        // Abort the previous request safely.
        try {
          storeApi.getState().abortController?.abort();
        } catch (e) {
          // Ignore errors thrown while aborting the previous request.
        }
        const abortController = new AbortController();
        storeApi.getState().setAbortController(abortController);
        storeApi.getState().setSenderSending(true);

        // Read the selected model from the store.
        const selectedSenderModels = storeApi.getState().selectedSenderModels;

        // Build the model object.
        let model;
        if (selectedSenderModels && selectedSenderModels.length > 0) {
          const currentModel = selectedSenderModels[0];
          model = {
            id: currentModel.id,
            model_display_name: currentModel.model_display_name,
          };
        }

        // Use chatEndpoint when provided; otherwise use the default request URL.
        const url = chatEndpoint || `/app/api/v1/sessions/${finalSessionId}/send`;

        const response = await fetch(url, {
          headers: requestClient.getCommonRequestHeaders({
            accept: 'text/event-stream',
            'Content-Type': 'application/json',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
          body: JSON.stringify({
            ...(chatEndpoint && storeSessionId ? { session_id: storeSessionId } : {}),
            // Include detail.interrupt_data from the matching chunk when present.
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
                  content: requestContent,
                  files,
                  ...(requestMetadata !== undefined && { metadata: requestMetadata }),
                  mock: false,
                  model,
                  general_agent_mode: generalAgentMode || (agentIdRef.current === '01' ? 'Default' : undefined),
                  ...(Object.keys(options).length > 0 && { options }),
                }),
          }),
          method: 'POST',
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
              // Remove stale temporary status messages first.
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
        // AbortError means the user stopped the request, so no error message is needed.
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Request was aborted in send');
          return;
        }

        console.error('Send error:', error);

        // Check network status.
        if (!navigator.onLine) {
          // Report the disconnection and wait for the online event instead of retrying here.
          console.log('Network is offline, waiting for reconnection');
          // Remove stale temporary status messages first.
          storeApi.getState().setChunks(filterFakeChunks(storeApi.getState().chunks));
          storeApi.getState().addChunk({
            id: `${FAKE_CHUNK_PREFIX}offline-${Date.now()}`,
            role: 'assistant',
            type: 'live_status',
            content: t('chatbot.task.network.offline'),
          });
          // Let the online event trigger recovery instead of scheduling a retry.
          return;
        }

        // Remove stale temporary status messages first.
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
      requestClient,
      storeApi,
      sessionIdRef,
      chatEndpoint,
      agentIdRef,
      sessionMode,
      showSenderActions,
      navigate,
      basePathRef,
      location.search,
      storeSessionId,
      handleResponse,
      onSendComplete,
      currentMessageRef,
      enableSendContinue,
      t,
      sendContinue,
      retryTimerRef,
    ],
  );

  return {
    send,
  };
};
