import { isPhoneHIL } from '@/registry/common/useHumanInTheLoop';
import { useAgentStore } from '@/store';
import { InnerMessageChunk } from '@/types';
import { devLog } from '@/utils';
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
    // 找到最后一条消息
    const lastMessage = pipelineMessages[pipelineMessages.length - 1];
    // 如果最后一条消息是assistant，则有可能需要用户操作
    if (lastMessage?.role === 'assistant') {
      // 找到最后一条消息中type为user_input的消息
      const userInputMessage = lastMessage.messages.find((item) => isPhoneHIL(item));
      // 如果找到，则需要用户操作
      if (userInputMessage && isRealTime) {
        return true;
      }
    }
    return false;
  }, [sessionInfo?.status, innerMessage, pipelineMessages, isRealTime]);

  return { needTakeOverPhone, innerMessage };
};

export default useTakeOverPhone;
