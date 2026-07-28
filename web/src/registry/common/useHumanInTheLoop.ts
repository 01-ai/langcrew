import { useAgentStore } from '@/store';
import { MessageChunk, UserInputChunk } from '@/types';

/**
 * I'm gonna tell you if it's a cloud phone.HILMessage
 * @param message Message
 * @returns Is it a cloud phone?HILMessage
 */
export const isPhoneHIL = (message: MessageChunk) =>
  (message.type === 'message_notify_user' &&
    message.detail?.scene === 'phone' &&
    message.detail?.intent_type === 'asking_user') ||
  (message.type === 'user_input' &&
    (message as UserInputChunk).detail?.interrupt_data?.suggested_user_action === 'take_over_phone');

/**
 * Let's see if the message is taking over the browser.HILMessage
 * @param message Message
 * @returns Whether to take over the browserHILMessage
 */
export const isBrowserHIL = (message: MessageChunk) =>
  (message.detail?.interrupt_data?.type === 'take_over_browser' ||
    message.detail?.interrupt_data?.suggested_user_action === 'take_over_browser') &&
  message.detail?.interrupt_data?.intervention_info?.intervention_url;

const useHumanInTheLoop = (message: MessageChunk) => {
  const { sessionInfo } = useAgentStore();

  // Validity of the session
  const sessionActive = sessionInfo?.status !== 'ARCHIVED';

  // User Enable
  const userInputable = sessionActive && message.isLast;

  // Take over the browser message.
  const isTakeOverBrowserMessage = isBrowserHIL(message);

  // Whether to show the take-over browser (last piece of information)
  const showTakeOverBrowser = isTakeOverBrowserMessage && message.isLast;

  // I'm taking over the phone.
  const isTakeOverPhoneMessage = isPhoneHIL(message);

  // Show whether to take over the mobile phone (last one)
  const showTakeOverPhone = isTakeOverPhoneMessage && message.isLast;

  // Messages with Options
  const isOptionMessage = message?.detail?.options?.length > 0;
  // Whether to show options (not take over browser and take over mobile phone messages)
  const showOptionContainer = !isTakeOverBrowserMessage && !isTakeOverPhoneMessage && isOptionMessage;

  return {
    /**
     * Whether to show the takeover browser
     * 1. It's taking over the browser message.
     * 2. It's the last piece of news.
     */
    showTakeOverBrowser,
    /**
     * Whether to show the take over cell phone
     * 1. It's the phone that's been taken over.
     * 2. It's the last piece of news.
     */
    showTakeOverPhone,
    /**
     * Whether to show options
     * 1. Not the browser and the phone.
     * 2. Options
     * 3. Is the last message all show, but not the last message is not a click.
     */
    showOptionContainer,
    /**
     * User Enable
     * 1. Session not expired
     * 2. It's the last piece of news.
     */
    userInputable,
  };
};

export default useHumanInTheLoop;
