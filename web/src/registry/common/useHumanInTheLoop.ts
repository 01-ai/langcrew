import { useAgentStore } from '@/store';
import { MessageChunk, UserInputChunk } from '@/types';

/**
 * 判断消息是否是云手机HIL消息
 * @param message 消息
 * @returns 是否是云手机HIL消息
 */
export const isPhoneHIL = (message: MessageChunk) =>
  (message.type === 'message_notify_user' &&
    message.detail?.scene === 'phone' &&
    message.detail?.intent_type === 'asking_user') ||
  (message.type === 'user_input' &&
    (message as UserInputChunk).detail?.interrupt_data?.suggested_user_action === 'take_over_phone');

/**
 * 判断消息是否是接管浏览器HIL消息
 * @param message 消息
 * @returns 是否是接管浏览器HIL消息
 */
export const isBrowserHIL = (message: MessageChunk) =>
  (message.detail?.interrupt_data?.type === 'take_over_browser' ||
    message.detail?.interrupt_data?.suggested_user_action === 'take_over_browser') &&
  message.detail?.interrupt_data?.intervention_info?.intervention_url;

const useHumanInTheLoop = (message: MessageChunk) => {
  const { sessionInfo } = useAgentStore();

  // 会话是否有效
  const sessionActive = sessionInfo.status !== 'ARCHIVED';

  // 用户是否可操作
  const userInputable = sessionActive && message.isLast;

  // 接管浏览器的消息
  const isTakeOverBrowserMessage = isBrowserHIL(message);

  // 是否显示接管浏览器（最后一坨消息）
  const showTakeOverBrowser = isTakeOverBrowserMessage && message.isLast;

  // 接管手机的消息
  const isTakeOverPhoneMessage = isPhoneHIL(message);

  // 是否显示接管手机（最后一条）
  const showTakeOverPhone = isTakeOverPhoneMessage && message.isLast;

  // 有选项的消息
  const isOptionMessage = message?.detail?.options?.length > 0;
  // 是否显示选项（不是接管浏览器和接管手机的消息）
  const showOptionContainer = !isTakeOverBrowserMessage && !isTakeOverPhoneMessage && isOptionMessage;

  return {
    /**
     * 是否显示接管浏览器
     * 1. 是接管浏览器消息
     * 2. 是最后一坨消息
     */
    showTakeOverBrowser,
    /**
     * 是否显示接管手机
     * 1. 是接管手机消息
     * 2. 是最后一坨消息
     */
    showTakeOverPhone,
    /**
     * 是否显示选项
     * 1. 不是接管浏览器和接管手机的消息
     * 2. 有选项
     * 3. 是不是最后一坨消息都显示，但是非最后一坨消息的不能点击
     */
    showOptionContainer,
    /**
     * 用户是否可操作
     * 1. 会话未失效
     * 2. 是最后一坨消息
     */
    userInputable,
  };
};

export default useHumanInTheLoop;
