import { EventErrorChunk, FileItem, KnowledgeBaseItem, MCPToolItem, MessageChunk, UserInputChunk } from '@/types';
import { useCallback, useEffect, useRef } from 'react';

import { XStream } from '@ant-design/x';
import { useAgentStore } from '@/store';
import { useChunksProcessor } from '../useChunksProcessor';
import { sessionApi } from '@/services/api';
import { isJsonString } from '@/utils/json';

import eventBus from '@/utils/eventBus';
import { getLanguage } from '../useTranslation';
import { message } from 'antd';

export interface SendOptions {
  content: string;
  files?: FileItem[];
  mcpTools?: MCPToolItem[];
  knowledgeBases?: KnowledgeBaseItem[];
}

const DEBOUNCE_TIME = 16;

interface UseChatReturn {
  /**
   * send message
   */
  send: (options: SendOptions) => Promise<void>;

  /**
   * stop task, directly call the stop interface, instead of disconnecting sse
   */
  stop: () => void;
}

/**
 * call function using hook
 * read data using store
 */
const useChat = (): UseChatReturn => {
  // stores
  const { chunks } = useAgentStore();

  // states

  // use chunks from global store
  useChunksProcessor(chunks);

  const debounceTimer = useRef<number>(0);
  const pendingChunks = useRef<MessageChunk[]>([]);

  const addPendingChunks = useCallback(() => {
    if (pendingChunks.current.length === 0) {
      return;
    }
    useAgentStore.getState().addChunks(pendingChunks.current);
    pendingChunks.current = [];
  }, []);

  // functions

  /**
   * immutable function
   */
  const handleChunk = useCallback((chunk: string) => {
    if (!isJsonString(chunk)) {
      console.error('handleChunk chunk is not json string', chunk);
      return;
    }
    const data = JSON.parse(chunk) as MessageChunk;

    // if send returns user message, it means the return of add_message, at this time, senderLoading needs to be set to false
    if (data.role === 'user') {
      // filter out chunks with loading true
      useAgentStore.getState().setChunks(useAgentStore.getState().chunks.filter((chunk) => !chunk.loading));
      // set senderLoading to false, allow sending new message
      useAgentStore.getState().setSenderLoading(false);
      // here we don't return, because there is still addChunk
    }

    if ((data as EventErrorChunk).code === 4102) {
      useAgentStore.getState().addChunk({
        id: Date.now().toString(),
        role: 'assistant',
        type: 'error',
        content: (data as EventErrorChunk).message || 'Session is archived',
      });
      useAgentStore.getState().setSessionInfo({
        ...useAgentStore.getState().sessionInfo,
        status: 'ARCHIVED',
      });
      return;
    }
    if (data.type === 'session_init') {
      const {
        detail: { session_id, title },
      } = data;

      useAgentStore.getState().setSessionInfo({
        session_id,
        title,
      } as any);

      return;
    }
    pendingChunks.current.push(data);
  }, []);

  /**
   * immutable function
   */
  const onSendComplete = useCallback(() => {
    if (useAgentStore.getState().senderSending) {
      useAgentStore.getState().setSenderSending(false);
    }
    // if senderStopping is true, set to false
    if (useAgentStore.getState().senderStopping) {
      useAgentStore.getState().setSenderStopping(false);
    }
  }, []);

  /**
   * immutable function
   */
  const handleResponse = useCallback(
    async (response: Response, onTimeout: () => void, onComplete: () => void) => {
      if (!debounceTimer.current) {
        debounceTimer.current = window.setInterval(() => {
          addPendingChunks();
          debounceTimer.current = 0;
        }, DEBOUNCE_TIME);
      }
      for await (const chunk of XStream({
        readableStream: response.body,
      })) {
        handleChunk(chunk.data);
      }
      onComplete();
      if (debounceTimer.current) {
        window.clearInterval(debounceTimer.current);
        debounceTimer.current = 0;
        addPendingChunks();
      }
    },
    [addPendingChunks, handleChunk],
  );

  const send = useCallback(
    async ({ content, files = [], mcpTools = [], knowledgeBases = [] }: SendOptions) => {
      const sessionId = useAgentStore.getState().sessionInfo?.session_id;

      if (useAgentStore.getState().senderSending) {
        useAgentStore.getState().setSenderLoading(true);
        try {
          useAgentStore.getState().addChunk({
            id: Date.now().toString(),
            role: 'user',
            type: 'text',
            content,
            loading: true,
            timestamp: Date.now(),
          });
          await sessionApi.addNewMessage(sessionId, content);
        } catch (error) {
          console.error('Failed to add new message:', error);
          useAgentStore.getState().setSenderLoading(false);
        }
        return;
      }

      useAgentStore.getState().setSenderLoading(true);

      try {
        const pipelineMessages = useAgentStore.getState().pipelineMessages;
        // get the last user_input message
        const userInputChunk = pipelineMessages[pipelineMessages.length - 1]?.messages?.find(
          (msg) => msg.type === 'user_input',
        ) as UserInputChunk;
        const previousMessage = pipelineMessages[pipelineMessages.length - 2]?.messages?.[0];

        // add user message to chunks
        useAgentStore.getState().addChunk({
          // user message
          // message id
          id: 'fake-' + Date.now().toString(),
          // message type
          type: 'text',
          // message role
          role: 'user',
          // user input message
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
        });

        useAgentStore.getState().abortController?.abort();
        const abortController = new AbortController();
        useAgentStore.getState().setAbortController(abortController);
        useAgentStore.getState().setSenderSending(true);
        const response = await fetch(`${useAgentStore.getState().requestPrefix}/api/v1/chat`, {
          headers: {
            accept: 'text/event-stream',
            'Content-Type': 'application/json',
            language: getLanguage(),
          },
          body: JSON.stringify({
            session_id: sessionId,
            message: content,
            files,
            // if userInputChunk exists, assign the detail.interrupt_data of userInputChunk to the body
            ...(userInputChunk?.detail?.interrupt_data
              ? {
                  interrupt_data: {
                    ...userInputChunk.detail.interrupt_data,
                    content: previousMessage?.content,
                    files: previousMessage?.detail?.attachments || previousMessage?.detail?.files,
                  },
                }
              : {}),
          }),
          method: 'POST',
          signal: abortController.signal,
        });
        useAgentStore.getState().setSenderLoading(false);

        if (!response.ok) {
          useAgentStore.getState().addChunk({
            id: Date.now().toString(),
            role: 'assistant',
            type: 'error',
            content: 'Failed to fetch',
          });
          throw new Error('Failed to fetch');
        }
        // removeFakeChunks();

        handleResponse(response, () => {}, onSendComplete);
      } catch (error) {
        useAgentStore.getState().setSenderLoading(false);
        // if AbortError, it means the user主动中断了请求，不需要显示错误
        if (error.name === 'AbortError') {
          console.error('Request was aborted by user');
          return;
        }

        console.error('Send error:', error);

        message.error(error.message);
        onSendComplete();
      }
    },
    [handleResponse, onSendComplete],
  );

  const stop = useCallback(() => {
    const sessionId = useAgentStore.getState().sessionInfo?.session_id;
    useAgentStore.getState().setSenderStopping(true);
    sessionApi.stopTask(sessionId);
  }, []);

  // effects

  useEffect(() => {
    const handleUserInputClick = (option: string) => {
      send({ content: option });
    };
    eventBus.on('user_input_click', handleUserInputClick);
    return () => {
      eventBus.off('user_input_click', handleUserInputClick);
    };
  }, [send]);

  // returns

  return {
    send,
    stop,
  };
};

export default useChat;
