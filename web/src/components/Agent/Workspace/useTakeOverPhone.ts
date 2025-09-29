import { isPhoneHIL } from '@/registry/common/useHumanInTheLoop';
import { useAgentStore } from '@/store';
import { InnerMessageChunk } from '@/types';
import dayjs from 'dayjs';
import { useMemo } from 'react';

const useTakeOverPhone = (isRealTime: boolean) => {
  const { pipelineMessages, sessionInfo, chunks } = useAgentStore();

  const innerMessage = useMemo(() => {
    return chunks.findLast((item) => {
      const m = item as InnerMessageChunk;
      return (
        m.role === 'inner_message' &&
        m.detail?.access_key &&
        m.detail?.access_secret_key &&
        m.detail?.instance_no &&
        m.detail?.user_id &&
        dayjs(m.detail?.expire_time).isAfter(dayjs())
      );
    });
  }, [chunks]);

  const needTakeOverPhone = useMemo(() => {
    if (sessionInfo?.status === 'ARCHIVED') {
      return false;
    }
    if (!innerMessage) {
      return false;
    }
    // find the last message
    const lastMessage = pipelineMessages[pipelineMessages.length - 1];
    // if the last message is assistant, then it may need user operation
    if (lastMessage?.role === 'assistant') {
      // find the message with type user_input in the last message
      const userInputMessage = lastMessage.messages.find((item) => isPhoneHIL(item));
      // if found, then need user operation
      if (userInputMessage && isRealTime) {
        return true;
      }
    }
    return false;
  }, [sessionInfo?.status, innerMessage, pipelineMessages, isRealTime]);

  return { needTakeOverPhone, innerMessage };
};

export default useTakeOverPhone;
