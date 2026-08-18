/**
 * useChat constants
 */

// Timeout
export const CHUNK_TIMEOUT = 1000 * 60;

// Max retries
export const MAX_RETRY_COUNT = 30;

// Retry delay (3 minutes)
export const RETRY_DELAY = 1000 * 60 * 3;

// Chunk batch delay
export const DEBOUNCE_TIME = 16;

// Shared prefix for fake status chunks (not recognized by the server)
export const FAKE_CHUNK_PREFIX = '__status__';

/**
 * Tool-call types to ignore
 */
export const ignoreToolChunks = [
  'agent_update_plan',
  'agent_advance_phase',
  // 'message_notify_user',
  // 'agent_end_task',
  'config',
  'ask_user',
  // 'client_tool_call', // present but not shown
  'client_tool_result',
];

export const FAKE_USER_MESSAGE_PREFIX = 'fake-user-message-';