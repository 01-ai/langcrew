import { useAgentStore } from '@/store';
import { MessageChunk, UserInputChunk } from '@/types';

/**
 * Whether the message is cloud-phone HIL
 * @param message Message
 * @returns Whether this is a cloud-phone HIL message
 */
export const isPhoneHIL = (message: MessageChunk) =>
  (message.type === 'message_notify_user' &&
    message.detail?.scene === 'phone' &&
    message.detail?.intent_type === 'asking_user') ||
  (message.type === 'user_input' &&
    (message as UserInputChunk).detail?.interrupt_data?.suggested_user_action === 'take_over_phone');

/**
 * Whether the message is take-over-browser HIL
 * @param message Message
 * @returns Whether this is a take-over-browser HIL message
 */
export const isBrowserHIL = (message: MessageChunk) =>
  (message.detail?.interrupt_data?.type === 'take_over_browser' ||
    message.detail?.interrupt_data?.suggested_user_action === 'take_over_browser') &&
  message.detail?.interrupt_data?.intervention_info?.intervention_url;

const useHumanInTheLoop = (message: MessageChunk) => {
  const { sessionInfo } = useAgentStore();

  // Whether the session is valid
  const sessionActive = sessionInfo?.status !== 'ARCHIVED';

  // Whether the user can interact
  const userInputable = sessionActive && message.isLast;

  // Take-over-browser message
  const isTakeOverBrowserMessage = isBrowserHIL(message);

  // Show take-over-browser (last message batch)
  const showTakeOverBrowser = isTakeOverBrowserMessage && message.isLast;

  // Take-over-phone message
  const isTakeOverPhoneMessage = isPhoneHIL(message);

  // Show take-over-phone (last message)
  const showTakeOverPhone = isTakeOverPhoneMessage && message.isLast;

  // Message with options
  const isOptionMessage = message?.detail?.options?.length > 0;
  // Show options (not take-over-browser/phone)
  const showOptionContainer = !isTakeOverBrowserMessage && !isTakeOverPhoneMessage && isOptionMessage;

  return {
    /**
     * Whether to show take-over-browser
     * 1. Is a take-over-browser message
     * 2. Is the last message batch
     */
    showTakeOverBrowser,
    /**
     * Whether to show take-over-phone
     * 1. Is a take-over-phone message
     * 2. Is the last message batch
     */
    showTakeOverPhone,
    /**
     * Whether to show options
     * 1. Not a take-over-browser or take-over-phone message
     * 2. Has options
     * 3. Always shown; only the last batch is clickable
     */
    showOptionContainer,
    /**
     * Whether the user can interact
     * 1. Session is still valid
     * 2. Is the last message batch
     */
    userInputable,
  };
};

export default useHumanInTheLoop;
