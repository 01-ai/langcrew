import { App, Input, InputRef, message } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getTranslation, useTranslation } from '@/hooks/useTranslation';
import { useChunksUISync } from './useChunksUISync';
import { useAgentStore, useAgentStoreApi, useRequestClient } from '@/store';
import { SessionInfo } from '@/types';
import { XStream } from '@ant-design/x-sdk';
import { isJsonString } from '@/utils/json';

const REPLAY_INTERVAL = 300;
const STREAMING_INTERVAL = 10; // Fluid playspace
const buttonStyle = {
  width: 76,
  height: 36,
};

const useReplay = (replayId: string, needPassword: boolean, defaultPassword: string = '') => {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const storeApi = useAgentStoreApi();
  const requestClient = useRequestClient();

  // Show when data is not availableloading
  const [loading, setLoading] = useState<boolean>(true);

  // Load finished
  const [loaded, setLoaded] = useState<boolean>(false);

  // Whether to play
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Error message
  const [error, setError] = useState<string>('');

  // The value of the password input box
  const passwordRef = useRef<string>(defaultPassword);

  // Password input boxref，ForautoFocus
  const inputRef = useRef<InputRef>(null);

  const waitTimeRef = useRef<number>(REPLAY_INTERVAL);

  // Originalchunks
  // const [originalChunks, setOriginalChunks] = useState<any[]>([]);
  const originalChunks = useRef<any[]>([]);

  // Add State: Whether or not to re-enter password
  const [needRetryPassword, setNeedRetryPassword] = useState<boolean>(false);

  // Use global store Medium chunks
  const { chunks } = useAgentStore();
  useChunksUISync(chunks);

  const playInterval = useRef<NodeJS.Timeout | null>(null);

  const end = useCallback(() => {
    if (loaded) {
      if (playInterval.current) {
        clearTimeout(playInterval.current);
      }
      setIsPlaying(false);
      storeApi.getState().setChunks([...originalChunks.current]);
    } else {
      waitTimeRef.current = 0;
    }
  }, [loaded, storeApi]);

  const start = useCallback(() => {
    storeApi.getState().setChunks([]);
    storeApi.getState().setFileViewerFile(undefined);
    storeApi.getState().setPipelineTargetMessage(undefined);
    storeApi.getState().setWorkspaceVisible(false);
    let index = 0;
    if (playInterval.current) {
      clearTimeout(playInterval.current);
    }
    setIsPlaying(true);

    const playNextChunk = () => {
      if (index < originalChunks.current.length) {
        storeApi.getState().addChunk(originalChunks.current[index]);
        index++;

        // According to the nextchunkType Settings Interval
        const nextInterval =
          index < originalChunks.current.length && originalChunks.current[index].type === 'text'
            ? STREAMING_INTERVAL
            : REPLAY_INTERVAL;
        playInterval.current = setTimeout(playNextChunk, nextInterval);
      } else {
        setIsPlaying(false);
      }
    };

    // Start playing firstchunk
    playNextChunk();

    return () => {
      if (playInterval.current) {
        clearTimeout(playInterval.current);
      }
      setIsPlaying(false);
    };
  }, [storeApi]);

  // Get share details - Remove Right askPassword Dependency
  const getShareChatDetail = useCallback(async () => {
    const params: any = {};
    // Add password if you need it
    if (needPassword) {
      params.encrypt = true;
      params.password = passwordRef.current;
    }
    setLoading(true);

    try {
      storeApi.getState().setChunks([]);
      storeApi.getState().abortController?.abort();
      const abortController = new AbortController();
      storeApi.getState().setAbortController(abortController);
      const response = await fetch(`/app/api/v1/sessions/share/${replayId}?${new URLSearchParams(params).toString()}`, {
        method: 'GET',
        headers: requestClient.getCommonRequestHeaders({
          'Content-Type': 'application/json',
        }),
        signal: abortController.signal,
      });
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
              storeApi
                .getState()
                .setSessionInfo({ title: chunkData.content, status: 'ARCHIVED' } as unknown as SessionInfo);
              continue;
            }
            if (chunkData.type === 'password_error') {
              message.error(getTranslation('error.password.incorrect'));
              // Setup requires re-entry of password status, not direct call askPassword
              setNeedRetryPassword(true);
              setLoading(false);
              return;
            }
            if (chunkData.type === 'all') {
              const allMessages = chunkData.messages || [];
              originalChunks.current = allMessages;

              setLoaded(true);
              start();
              return;
            }

            storeApi.getState().addChunk(chunkData);
            chunks.push(chunkData);
          }
          const waitTime = waitTimeRef.current; // chunkData.type === 'text' ? waitTimeRef.current : REPLAY_INTERVAL;

          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        originalChunks.current = chunks;
        setLoaded(true);
        setIsPlaying(false);
      } catch (error) {
        // If AbortError，Indicates that the user has voluntarily interrupted the request and does not need to show errors
        if (error.name === 'AbortError') {
          console.log('Request was aborted by user');
          return;
        }
        // Other errors are handled properly
        storeApi.getState().addChunk({
          id: Date.now().toString(),
          role: 'assistant',
          type: 'error',
          content: error.message,
        });
      }
      return;
    } catch (error) {
      setLoading(false);
      setError(t('share.fetch_failed'));
      console.error('Failed to get share detail:', error);
    }
  }, [needPassword, replayId, requestClient, start, storeApi, t]);

  useEffect(() => {
    return () => {
      storeApi.getState().resetStore();
    };
  }, [storeApi]);

  const askPassword = useCallback(() => {
    modal.confirm({
      title: t('share.authentication'),
      centered: true,
      cancelButtonProps: { style: buttonStyle },
      okButtonProps: {
        type: 'primary',
        style: buttonStyle,
      },
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
          }}
          required
        />
      ),
      onOk: () => {
        setNeedRetryPassword(false);
        getShareChatDetail();
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
  }, [getShareChatDetail, modal, t]);

  // The listening needs to re-enter the password status
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
