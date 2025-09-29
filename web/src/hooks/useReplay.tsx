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

const REPLAY_INTERVAL = 300;

const useReplay = (replayId: string, needPassword: boolean, defaultPassword: string = '') => {
  const { t } = useTranslation();

  // display loading when there is no data
  const [loading, setLoading] = useState<boolean>(true);

  // whether the loading is complete
  const [loaded, setLoaded] = useState<boolean>(false);

  // whether it is playing
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // error information
  const [error, setError] = useState<string>('');

  // value of the password input box
  const passwordRef = useRef<string>(defaultPassword);

  // password input box's ref, used to autoFocus
  const inputRef = useRef<InputRef>(null);

  // original chunks
  const [originalChunks, setOriginalChunks] = useState<any[]>([]);

  // new status: whether to re-enter the password
  const [needRetryPassword, setNeedRetryPassword] = useState<boolean>(false);

  // use chunks in the global store
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

  // get share details - remove the dependency on askPassword
  const getShareChatDetail = useCallback(async () => {
    const params: any = {};
    // if password is needed, add password
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
            if (chunkData.type === 'replay_session') {
              useAgentStore
                .getState()
                .setSessionInfo({ title: chunkData.content, status: 'ARCHIVED' } as unknown as SessionInfo);
              continue;
            }
            if (chunkData.type === 'password_error') {
              message.error(getTranslation('error.password.incorrect'));
              // set the status of needing to re-enter the password, instead of directly calling askPassword
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
        // if AbortError, it means the user interrupted the request
        if (error.name === 'AbortError') {
          console.error('Request was aborted by user');
          return;
        }
        // other errors are handled normally
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
      setError('Failed to get share detail');
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

  // listen to the status of needing to re-enter the password
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
