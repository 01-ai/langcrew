/**
 * useChat hook Relevant constant definitions
 */

// Timeout
export const CHUNK_TIMEOUT = 1000 * 60;

// Maximum number of retries
export const MAX_RETRY_COUNT = 30;

// Delay in retrying (3min)
export const RETRY_DELAY = 1000 * 60 * 3;

// Batch processingchunkDelays in
export const DEBOUNCE_TIME = 16;

// False chunk Uniform prefix (for state tips, not recognized by the server)
export const FAKE_CHUNK_PREFIX = '__status__';

/**
 * Tool Call Type to Ignore
 */
export const ignoreToolChunks = [
  'agent_update_plan',
  'agent_advance_phase',
  // 'message_notify_user',
  // 'agent_end_task',
  'config',
  'ask_user',
  // 'client_tool_call', // Yes, but not show.
  'client_tool_result',
];

export const FAKE_USER_MESSAGE_PREFIX = 'fake-user-message-';