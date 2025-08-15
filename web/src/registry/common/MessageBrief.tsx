import React from 'react';
import registry, { BriefRendererProps } from '..';

const MessageBrief = ({ message, ...props }: BriefRendererProps) => {
  const Brief = registry.getBriefRenderer(message.type);
  return <Brief message={message} {...props} />;
};

export default MessageBrief;
