import React, { useCallback } from 'react';
import registry, { BriefRendererProps } from '..';
import { useAgentStore, useAgentStoreApi } from '@/store';
import eventBus from '@/utils/eventBus';

const MessageBrief = ({ message, ...props }: BriefRendererProps) => {
  const { stopped } = useAgentStore();
  const storeApi = useAgentStoreApi();
  const Brief = registry.getBriefRenderer(message.type);

  const send = useCallback(
    (content: string) => {
      const { instanceId, setSenderMetadata } = storeApi.getState();
      eventBus.emit(`call_send_${instanceId}`, { content });
      setSenderMetadata(undefined);
    },
    [storeApi],
  );

  return <Brief message={message} send={send} stopped={stopped} {...props} />;
};

export default MessageBrief;
