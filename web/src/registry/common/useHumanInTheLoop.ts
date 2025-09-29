import { useAgentStore } from '@/store';
import { MessageChunk, UserInputChunk } from '@/types';

/**
 * check if the message is a phone HIL message
 * @param message message
 * @returns whether the message is a phone HIL message
 */
export const isPhoneHIL = (message: MessageChunk) =>
  (message.type === 'message_to_user' &&
    message.detail?.scene === 'phone' &&
    message.detail?.intent_type === 'asking_user') ||
  (message.type === 'user_input' &&
    (message as UserInputChunk).detail?.interrupt_data?.suggested_user_action === 'take_over_phone');

/**
 * check if the message is a browser HIL message
 * @param message message
 * @returns whether the message is a browser HIL message
 */
export const isBrowserHIL = (message: MessageChunk) =>
  (message.detail?.interrupt_data?.type === 'take_over_browser' ||
    message.detail?.interrupt_data?.suggested_user_action === 'take_over_browser') &&
  message.detail?.interrupt_data?.intervention_info?.intervention_url;

const useHumanInTheLoop = (message: MessageChunk) => {
  const { sessionInfo } = useAgentStore();

  // whether the session is active
  const sessionActive = sessionInfo.status !== 'ARCHIVED';

  // whether the user can operate
  const userInputable = sessionActive && message.isLast;

  // the message to take over the browser
  const isTakeOverBrowserMessage = isBrowserHIL(message);

  // whether to show the take over browser (the last message)
  const showTakeOverBrowser = isTakeOverBrowserMessage && message.isLast;

  // the message to take over the phone
  const isTakeOverPhoneMessage = isPhoneHIL(message);

  // whether to show the take over phone (the last message)
  const showTakeOverPhone = isTakeOverPhoneMessage && message.isLast;

  // the message with options
  const isOptionMessage = message?.detail?.options?.length > 0;
  // whether to show the option container (not the message to take over the browser and the message to take over the phone)
  const showOptionContainer = !isTakeOverBrowserMessage && !isTakeOverPhoneMessage && isOptionMessage;

  return {
    /**
     * whether to show the take over browser
     * 1. the message to take over the browser
     * 2. the last message
     */
    showTakeOverBrowser,
    /**
     * whether to show the take over phone
     * 1. the message to take over the phone
     * 2. the last message
     */
    showTakeOverPhone,
    /**
     * whether to show the option container
     * 1. not the message to take over the browser and the message to take over the phone
     * 2. has options
     * 3. whether to show the option container (the last message)
     */
    showOptionContainer,
    /**
     * whether the user can operate
     * 1. the session is active
     * 2. the last message
     */
    userInputable,
  };
};

export default useHumanInTheLoop;
