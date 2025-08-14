import React from 'react';
import { BriefRendererProps } from '..';
import { Markdown } from '@/components/Infra';

import PhoneHIL from '../common/PhoneHIL';
import useHumanInTheLoop from '../common/useHumanInTheLoop';

const MessageNotifyUserBriefRenderer: React.FC<BriefRendererProps> = ({ message }) => {
  const { showTakeOverPhone, userInputable } = useHumanInTheLoop(message);

  return (
    <>
      <Markdown content={message.content} />
      {showTakeOverPhone && <PhoneHIL userInputable={userInputable} />}
    </>
  );
};

export default MessageNotifyUserBriefRenderer;
