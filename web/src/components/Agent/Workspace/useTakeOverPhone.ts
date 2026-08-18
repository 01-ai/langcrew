import { isPhoneHIL } from '@/registry/common/useHumanInTheLoop';
import { useAgentStore } from '@/store';
import { CloudPhoneAuthInfo, InnerMessageChunk, UserInputChunk } from '@/types';
import dayjs from 'dayjs';
import { useMemo } from 'react';

const useTakeOverPhone = (isRealTime: boolean) => {
  const { pipelineMessages, sessionInfo, chunks } = useAgentStore();

  const authInfo: CloudPhoneAuthInfo | null = useMemo(() => {
    // New protocol: auth_info on the chunk
    const authChunk = chunks.findLast((item) => {
      const userInputChunk = item as UserInputChunk;
      return (
        userInputChunk.detail?.interrupt_data?.intervention_info?.auth_info &&
        dayjs(userInputChunk.detail?.interrupt_data?.intervention_info?.auth_info.expire_time).isAfter(dayjs())
      );
    });
    if (authChunk) {
      return authChunk?.detail?.interrupt_data?.intervention_info?.auth_info;
    }
    // Legacy protocol: nested inner_message
    const innerMessageChunk = chunks.findLast((item) => {
      const chunk = item as InnerMessageChunk;
      return (
        chunk.role === 'inner_message' &&
        chunk.detail?.access_key &&
        chunk.detail?.access_secret_key &&
        chunk.detail?.instance_no &&
        chunk.detail?.user_id &&
        dayjs(chunk.detail?.expire_time).isAfter(dayjs())
      );
    });
    if (innerMessageChunk) {
      return {
        instance_no: innerMessageChunk.detail?.instance_no,
        access_key: innerMessageChunk.detail?.access_key,
        access_secret_key: innerMessageChunk.detail?.access_secret_key,
        user_id: innerMessageChunk.detail?.user_id,
        expire_time: innerMessageChunk.detail?.expire_time,
      } as CloudPhoneAuthInfo;
    }
    return null;
  }, [chunks]);

  const needTakeOverPhone = useMemo(() => {
    if (sessionInfo?.status === 'ARCHIVED') {
      return false;
    }
    if (!authInfo) {
      return false;
    }
    // Find the last message
    const lastMessage = pipelineMessages[pipelineMessages.length - 1];
    // An assistant tail message may require HITL
    if (lastMessage?.role === 'assistant') {
      // Find a user_input chunk in the last message
      const userInputMessage = lastMessage.messages.find((item) => isPhoneHIL(item));
      // HITL is required when a user_input chunk is present
      if (userInputMessage && isRealTime) {
        return true;
      }
    }
    return false;
  }, [sessionInfo?.status, authInfo, pipelineMessages, isRealTime]);

  return { needTakeOverPhone, authInfo, canTakeOverPhone: !!authInfo };
};

export default useTakeOverPhone;
