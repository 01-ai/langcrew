import { Input, InputRef, Modal, message } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getLanguage, getTranslation, useTranslation } from '@/hooks/useTranslation';
import { mockData } from './useChat/mock';
import { useChunksProcessor } from './useChunksProcessor';
import { useAgentStore } from '@/store';
import { shareApi } from '@/services/api';
import { SessionInfo } from '@/types';
import { XStream } from '@ant-design/x';
import { isJsonString } from '@/utils/json';
import { devLog } from '@/utils';

const REPLAY_INTERVAL = 300;

const useReplay = (replayId: string, needPassword: boolean, defaultPassword: string = '') => {
  const { t } = useTranslation();

  // 没数据的时候显示loading
  const [loading, setLoading] = useState<boolean>(true);

  // 是否加载完成
  const [loaded, setLoaded] = useState<boolean>(false);

  // 是否正在播放
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // 错误信息
  const [error, setError] = useState<string>('');

  // 密码输入框的值
  const passwordRef = useRef<string>(defaultPassword);

  // 密码输入框的ref，用来autoFocus
  const inputRef = useRef<InputRef>(null);

  // 原始chunks
  const [originalChunks, setOriginalChunks] = useState<any[]>([]);

  // 新增状态：是否需要重新输入密码
  const [needRetryPassword, setNeedRetryPassword] = useState<boolean>(false);

  // 使用全局 store 中的 chunks
  const { chunks } = useAgentStore();
  useChunksProcessor(chunks);

  const playInterval = useRef<NodeJS.Timeout | null>(null);

  const end = useCallback(() => {
    if (playInterval.current) {
      clearInterval(playInterval.current);
    }
    setIsPlaying(false);
    useAgentStore.getState().setChunks([...originalChunks]);
  }, [originalChunks]);

  const start = useCallback(() => {
    useAgentStore.getState().setChunks([]);
    useAgentStore.getState().setFileViewerFile(undefined);
    useAgentStore.getState().setPipelineTargetMessage(undefined);
    // useAgentStore.getState().setWorkspaceVisible(false);
    let index = 0;
    if (playInterval.current) {
      clearInterval(playInterval.current);
    }
    setIsPlaying(true);
    playInterval.current = setInterval(() => {
      if (index < originalChunks.length) {
        useAgentStore.getState().addChunk(originalChunks[index]);
        index++;
      } else {
        clearInterval(playInterval.current);
        setIsPlaying(false);
      }
    }, REPLAY_INTERVAL);
    return () => {
      clearInterval(playInterval.current);
      setIsPlaying(false);
    };
  }, [originalChunks]);

  // 获取分享详情 - 移除对 askPassword 的依赖
  const getShareChatDetail = useCallback(async () => {
    const params: any = {};
    // 如果需要密码，则添加密码
    if (needPassword) {
      params.encrypt = true;
      params.password = passwordRef.current;
    }
    setLoading(true);

    try {
      const response = await fetch(
        `${useAgentStore.getState().requestPrefix}/api/v1/sessions/share/${replayId}?${new URLSearchParams(
          params,
        ).toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            language: getLanguage(),
          },
        },
      );
      if (!response.ok) {
        setError(response.statusText);
        setLoading(false);
        return;
      }
      const chunks = [];
      setLoading(false);
      setIsPlaying(true);
      try {
        for await (const chunk of XStream({
          readableStream: response.body,
        })) {
          const chunkData = isJsonString(chunk.data) ? JSON.parse(chunk.data) : null;
          if (chunkData) {
            devLog('chunkData', chunkData);
            if (chunkData.type === 'replay_session') {
              useAgentStore
                .getState()
                .setSessionInfo({ title: chunkData.content, status: 'ARCHIVED' } as unknown as SessionInfo);
              continue;
            }
            if (chunkData.type === 'password_error') {
              message.error(getTranslation('error.password.incorrect'));
              // 设置需要重新输入密码的状态，而不是直接调用 askPassword
              setNeedRetryPassword(true);
              setLoading(false);
              return;
            }
            useAgentStore.getState().addChunk(chunkData);
            chunks.push(chunkData);
          }
          await new Promise((resolve) => setTimeout(resolve, REPLAY_INTERVAL));
        }
        setOriginalChunks(chunks);
        setLoaded(true);
        setIsPlaying(false);
      } catch (error) {
        // 如果是 AbortError，说明用户主动中断了请求，不需要显示错误
        if (error.name === 'AbortError') {
          console.error('Request was aborted by user');
          return;
        }
        // 其他错误正常处理
        useAgentStore.getState().addChunk({
          id: Date.now().toString(),
          role: 'assistant',
          type: 'error',
          content: error.message,
        });
      }
      return;
    } catch (error) {
      setLoading(false);
      setError('获取分享详情失败');
      console.error('Failed to get share detail:', error);
    }
  }, [needPassword, replayId]);

  const askPassword = useCallback(async () => {
    const modal = await Modal.confirm({
      title: t('share.authentication'),
      content: (
        <Input.Password
          placeholder={t('share.password')}
          autoFocus
          ref={inputRef}
          defaultValue={passwordRef.current}
          onChange={(e) => {
            passwordRef.current = e.target.value;
          }}
          onPressEnter={() => {
            setNeedRetryPassword(false);
            getShareChatDetail();
            modal.destroy();
          }}
          required
        />
      ),
      onOk: () => {
        setNeedRetryPassword(false);
        getShareChatDetail();
        modal.destroy();
      },
      onCancel: () => {
        setLoading(false);
        setNeedRetryPassword(false);
      },
      afterOpenChange(open) {
        if (open) {
          inputRef.current?.focus();
        }
      },
    });
  }, [getShareChatDetail, t]);

  // 监听需要重新输入密码的状态
  useEffect(() => {
    if (needRetryPassword) {
      askPassword();
    }
  }, [needRetryPassword, askPassword]);

  useEffect(() => {
    if (needPassword && !defaultPassword) {
      askPassword();
    } else {
      getShareChatDetail();
    }
  }, [askPassword, getShareChatDetail, needPassword, defaultPassword]);

  return {
    isPlaying,
    loading,
    loaded,
    start,
    end,
  };
};

export default useReplay;
