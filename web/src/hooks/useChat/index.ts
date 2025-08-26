import {
  EventErrorChunk,
  FileItem,
  KnowledgeBaseItem,
  MCPToolItem,
  MessageChunk,
  SessionIdChunk,
  SessionInfo,
  UserInputChunk,
} from '@/types';
import { useCallback, useEffect, useRef } from 'react';

import { XStream } from '@ant-design/x';
import { createSession, getSession, isMessageFinish, transformChunksToMessages } from './utils';
import { useAgentStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import { useChunksProcessor } from '../useChunksProcessor';
import { sessionApi } from '@/services/api';
import { isJsonString } from '@/utils/json';
import { devLog } from '@/utils';
import { isSandboxToolItem } from '@/components/Agent/Chatbot/Sender/components/ToolItem';
import eventBus from '@/utils/eventBus';
import { getLanguage } from '../useTranslation';
import { message } from 'antd';

export interface SendOptions {
  content: string;
  files?: FileItem[];
  mcpTools?: MCPToolItem[];
  knowledgeBases?: KnowledgeBaseItem[];
}

interface UseChatReturn {
  /**
   * 发送消息
   */
  send: (options: SendOptions) => Promise<void>;

  /**
   * 停止任务，直接调用停止接口，而不是断掉sse
   */
  stop: () => void;
}

// 超时时间
const CHUNK_TIMEOUT = 1000 * 60 * 3;
// 最大重试次数
const MAX_RETRY_COUNT = 10;
// 重试延迟时间
const RETRY_DELAY = 1000 * 60; // 1分钟延迟

/**
 * 调用函数使用hook
 * 读取数据使用store
 */
const useChat = (basePath: string, agentId: string, sessionId: string): UseChatReturn => {
  useEffect(() => {
    devLog('useChat mount', basePath, agentId, sessionId);
    return () => {
      devLog('useChat unmount');
    };
  }, []);

  // stores
  const { chunks } = useAgentStore();

  const navigate = useNavigate();

  // states

  // 使用全局 store 中的 chunks
  useChunksProcessor(chunks);

  // refs

  const basePathRef = useRef<string>(basePath);
  const agentIdRef = useRef<string>(agentId);
  // 使用 ref 存储最新的 sessionId，避免闭包问题
  const sessionIdRef = useRef<string>(sessionId);

  // functions

  /**
   * 不变的函数
   */
  const handleChunk = useCallback((chunk: string) => {
    if (!isJsonString(chunk)) {
      console.error('handleChunk chunk is not json string', chunk);
      return;
    }
    const data = JSON.parse(chunk) as MessageChunk;

    // devLog('handleChunk', data);

    // 如果send返回了user消息，说明是add_message的返回，此时需要设置senderLoading为false
    if (data.role === 'user') {
      // 把loading为true的chunk过滤掉
      useAgentStore.getState().setChunks(useAgentStore.getState().chunks.filter((chunk) => !chunk.loading));
      // 设置senderLoading为false，允许发送新消息
      useAgentStore.getState().setSenderLoading(false);
      // 这里不return，因为还有addChunk
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

      const finalSessionId = session_id;

      useAgentStore.getState().setSessionInfo({
        session_id,
        title,
      } as any);
      //   useAgentStore.getState().setChunks([]);

      //   // 设置导航标志，避免触发 loadSessionData
      useAgentStore.getState().setIsNavigating(true);
      useAgentStore.getState().setPreviousSessionId(finalSessionId);
      navigate(`${basePathRef.current}/${agentIdRef.current}/${finalSessionId}`);
      //   // 立即更新 ref
      sessionIdRef.current = finalSessionId;
      return;
    }
    useAgentStore.getState().addChunk(data);
  }, []);

  /**
   * 不变的函数
   */
  const onSendComplete = useCallback(() => {
    if (useAgentStore.getState().senderSending) {
      useAgentStore.getState().setSenderSending(false);
    }
    // 如果senderStopping为true，则设置为false
    if (useAgentStore.getState().senderStopping) {
      useAgentStore.getState().setSenderStopping(false);
    }
    // if (chunkTimer.current) {
    //   clearTimeout(chunkTimer.current);
    //   chunkTimer.current = null;
    // }
  }, []);

  const chunkTimer = useRef(null);

  /**
   * 不变的函数
   */
  const handleResponse = useCallback(
    async (response: Response, onTimeout: () => void, onComplete: () => void) => {
      // 如果send，不计时（因为没chunk，没法send-continue），如果是send-continue，则计时
      // if (useAgentStore.getState().chunks.length > 1) {
      //   if (chunkTimer.current) {
      //     clearTimeout(chunkTimer.current);
      //     chunkTimer.current = null;
      //   }
      //   chunkTimer.current = setTimeout(() => {
      //     // 如果两个chunk之间的时间超过CHUNK_TIMEOUT，则抛出错误，触发send-continue
      //     devLog('Chunk timeout 1');
      //     // throw new Error('Chunk timeout');
      //     useAgentStore.getState().abortController?.abort();
      //     useAgentStore.getState().setSenderSending(false);
      //     onTimeout();
      //   }, CHUNK_TIMEOUT);
      // }

      for await (const chunk of XStream({
        readableStream: response.body,
      })) {
        // if (chunkTimer.current) {
        //   clearTimeout(chunkTimer.current);
        //   chunkTimer.current = null;
        // }
        // chunkTimer.current = setTimeout(() => {
        //   // 如果两个chunk之间的时间超过CHUNK_TIMEOUT，则抛出错误，触发send-continue
        //   devLog('Chunk timeout 2');
        //   // throw new Error('Chunk timeout');
        //   useAgentStore.getState().abortController?.abort();
        //   useAgentStore.getState().setSenderSending(false);
        //   onTimeout();
        // }, CHUNK_TIMEOUT);
        handleChunk(chunk.data);
      }
      onComplete();
    },
    [handleChunk],
  );

  /**
   * 不变的函数
   */
  const handleRetryMax = useCallback(() => {
    console.error('send-continue 达到最大重试次数，停止重试');
    useAgentStore.getState().addChunk({
      id: Date.now().toString(),
      role: 'assistant',
      type: 'error',
      content: `send-continue 失败，已重试 ${MAX_RETRY_COUNT} 次`,
    });
    onSendComplete();
  }, [onSendComplete]);

  const sendContinue = useCallback(
    async (retryCount = 0) => {
      // 发送按钮开始转圈，此时不能发送
      useAgentStore.getState().setSenderLoading(true);

      const chunks = useAgentStore.getState().chunks;
      try {
        useAgentStore.getState().abortController?.abort();
        const abortController = new AbortController();
        useAgentStore.getState().setAbortController(abortController);
        useAgentStore.getState().setSenderSending(true);
        const response = await fetch(
          `${useAgentStore.getState().requestPrefix}/api/v1/sessions/${sessionIdRef.current}/send-continue`,
          {
            method: 'POST',
            headers: {
              accept: 'text/event-stream',
              'Content-Type': 'application/json',
              language: getLanguage(),
            },
            body: JSON.stringify({
              chunk_id: chunks[chunks.length - 1]?.id || '',
            }),
            signal: abortController.signal,
          },
        );
        // 发送按钮停止转圈，此时可以发送
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

        handleResponse(
          response,
          () => {
            if (retryCount < MAX_RETRY_COUNT) {
              sendContinue(retryCount + 1);
            } else {
              handleRetryMax();
            }
          },
          onSendComplete,
        );
      } catch (error) {
        useAgentStore.getState().setSenderLoading(false);
        // 如果是 AbortError，说明用户主动中断了请求，不需要显示错误
        if (error.name === 'AbortError') {
          console.error('Request was aborted by user');
          return;
        }

        console.error('send-continue error', error);

        // 检查重试次数
        if (retryCount < MAX_RETRY_COUNT) {
          if (chunkTimer.current) {
            clearTimeout(chunkTimer.current);
            chunkTimer.current = null;
          }
          chunkTimer.current = setTimeout(() => {
            sendContinue(retryCount + 1);
          }, RETRY_DELAY);
        } else {
          // 达到最大重试次数，显示错误
          handleRetryMax();
        }
      }
    },
    [handleResponse, handleRetryMax, onSendComplete],
  );

  // 加载 session 数据的函数
  const loadSessionData = useCallback(
    async (sessionId: string) => {
      try {
        // 这里应该调用实际的 API 来获取 session 数据
        const data = await getSession(sessionId);
        const session = data.session_info as SessionInfo;
        const sessionChunks = data.messages.reverse();
        useAgentStore.getState().setSessionInfo(session);
        useAgentStore.getState().setChunks([...sessionChunks]);

        const newMessages = transformChunksToMessages(sessionChunks);
        if (newMessages.length > 0) {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant' && !isMessageFinish(lastMessage)) {
            sendContinue(0);
          }
        }
      } catch (error) {
        console.error('Failed to load session data:', error);
      }
    },
    [sendContinue],
  );

  const send = useCallback(
    async ({ content, files = [], mcpTools = [], knowledgeBases = [] }: SendOptions) => {
      // let finalSessionId = sessionIdRef.current;

      if (useAgentStore.getState().senderSending) {
        useAgentStore.getState().setSenderLoading(true);
        try {
          await sessionApi.addNewMessage(sessionIdRef.current, content);
          useAgentStore.getState().addChunk({
            id: Date.now().toString(),
            role: 'user',
            type: 'text',
            content,
            loading: true,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error('Failed to add new message:', error);
          useAgentStore.getState().setSenderLoading(false);
        }
        return;
      }

      // 如果sessionId为空，则创建新的sessionId
      // if (!finalSessionId) {
      //   const session = await createSession({
      //     content,
      //     kb_ids: knowledgeBases.map((item) => item.knowledge_id),
      //     agent_tool_items: mcpTools.map((item) => ({
      //       agent_tool_id: isSandboxToolItem(item) ? item.agent_tool_id : item.id,
      //       agent_tool_type: isSandboxToolItem(item) ? item.tool_type : 'MCP',
      //     })),
      //     super_employee_id: agentIdRef.current === '01' ? '' : agentIdRef.current,
      //   });
      //   finalSessionId = session.session_id;
      //   useAgentStore.getState().setSessionInfo(session);
      //   useAgentStore.getState().setChunks([]);

      //   // 设置导航标志，避免触发 loadSessionData
      //   useAgentStore.getState().setIsNavigating(true);
      //   useAgentStore.getState().setPreviousSessionId(finalSessionId);
      //   navigate(`${basePathRef.current}/${agentIdRef.current}/${finalSessionId}`);
      //   // 立即更新 ref
      //   sessionIdRef.current = finalSessionId;
      // }

      useAgentStore.getState().setSenderLoading(true);

      try {
        const pipelineMessages = useAgentStore.getState().pipelineMessages;
        // 获取最后一个user_input消息
        const userInputChunk = pipelineMessages[pipelineMessages.length - 1]?.messages?.find(
          (msg) => msg.type === 'user_input',
        ) as UserInputChunk;
        const previousMessage = pipelineMessages[pipelineMessages.length - 2]?.messages?.[0];

        // 添加用户消息到 chunks
        useAgentStore.getState().addChunk({
          // 用户消息
          // 消息id
          id: 'fake-' + Date.now().toString(),
          // 消息类型
          type: 'text',
          // 消息角色
          role: 'user',
          // 用户输入的消息
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
            session_id: sessionIdRef.current,
            message: content,
            files,
            // 如果userInputChunk存在，则把userInputChunk的detail.interrupt_data赋值给body
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
        // 如果是 AbortError，说明用户主动中断了请求，不需要显示错误
        if (error.name === 'AbortError') {
          console.error('Request was aborted by user');
          return;
        }

        console.error('Send error:', error);

        message.error(error.message);
        onSendComplete();

        // if (chunkTimer.current) {
        //   clearTimeout(chunkTimer.current);
        //   chunkTimer.current = null;
        // }
        // chunkTimer.current = setTimeout(() => {
        //   sendContinue(0);
        // }, RETRY_DELAY);
      }
    },
    [handleResponse, onSendComplete],
  );

  const stop = useCallback(() => {
    useAgentStore.getState().setSenderStopping(true);
    const lastItemWithTaskId = useAgentStore.getState().chunks.findLast((chunk) => chunk?.task_id);
    if (lastItemWithTaskId?.task_id) {
      sessionApi.stopTask(lastItemWithTaskId?.task_id);
    } else {
      message.error('没有找到任务id，无法停止任务');
    }
  }, []);

  // effects

  // 更新 ref 中的 各种Id
  useEffect(() => {
    basePathRef.current = basePath;
    agentIdRef.current = agentId;
    sessionIdRef.current = sessionId;
  }, [basePath, agentId, sessionId]);

  // useEffect(() => {
  //   return () => {
  //     if (chunkTimer.current) {
  //       devLog('clear chunkTimer');
  //       clearTimeout(chunkTimer.current);
  //       chunkTimer.current = null;
  //     }
  //   };
  // }, []);

  useEffect(() => {
    const handleUserInputClick = (option: string) => {
      send({ content: option });
    };
    eventBus.on('user_input_click', handleUserInputClick);
    return () => {
      eventBus.off('user_input_click', handleUserInputClick);
    };
  }, [send]);

  // 当 sessionId 变化时，加载对应的 chunks 数据
  useEffect(() => {
    // 如果是由 navigate 导致的 sessionId 变化，则不加载数据
    // 这里使用 useAgentStore.getState() 来获取 isNavigating 的值，避免闭包问题
    if (useAgentStore.getState().isNavigating) {
      devLog('跳转页面，不加载数据');
      useAgentStore.getState().setIsNavigating(false);
      return;
    }

    if (useAgentStore.getState().previousSessionId === sessionId) {
      devLog('sessionId 没有变化，不加载数据');
      return;
    }
    useAgentStore.getState().setPreviousSessionId(sessionId);

    if (sessionId) {
      devLog('加载 session 数据', sessionId);
      // 加载 session 数据
      // loadSessionData(sessionId);
    } else {
      devLog('没有sessionId, reset store');
      useAgentStore.getState().resetStore();
    }
  }, [loadSessionData, sessionId]);

  // human in the loop 处理
  // useEffect(() => {
  //   const lastChunk = chunks[chunks.length - 1];
  //   if (lastChunk?.type === 'action_required') {
  //     setRequiredAction({
  //       type: lastChunk.detail?.type,
  //     });
  //   }
  // }, [chunks, setRequiredAction]);

  // // 模拟数据流
  // useEffect(() => {
  //   setChunks([]);
  //   // 模拟数据流，每1000ms添加一个chunk
  //   let index = 0;
  //   const interval = setInterval(() => {
  //     if (index < mockData.length) {
  //       handleChunk(JSON.stringify([mockData[index]]));
  //       index++;
  //     } else {
  //       clearInterval(interval);
  //     }
  //   }, 1000);

  //   return () => clearInterval(interval);
  // }, []); // 空依赖数组，只在组件挂载时执行一次

  // useEffect(() => {
  //   setChunks(mockData as MessageChunk[]);
  // }, []);

  // returns

  return {
    send,
    stop,
  };
};

export default useChat;
