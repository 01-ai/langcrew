# Chat Hook Tests

This directory covers the hooks that parse Agent events, send and resume
requests, load sessions, and recover interrupted streams.

## Coverage Areas

### `useChunkParser.test.ts`

- Parses valid chunks and ignores invalid JSON.
- Batches pending chunks into the store.
- Replaces temporary user-message chunks with server chunks.
- Handles archived sessions in page and embedded modes.
- Executes client tools and returns `client_tool_result` when required.

### `useSendContinue.test.ts`

- Sends `send-continue` with the last real chunk ID.
- Prevents duplicate requests.
- Adds and removes temporary loading chunks.
- Handles offline, aborted, failed, and interrupted requests.
- Enforces retry limits and completion callbacks.

### `useSend.test.ts`

- Sends messages, server actions, and client tool results.
- Creates sessions in page and embedded modes.
- Includes files, selected models, metadata, and `interrupt_data`.
- Handles concurrent sends, aborts, offline state, and retries.
- Keeps sender state consistent after completion or failure.

### `useSessionManager.test.ts`

- Cleans timers, requests, and pending chunks from the previous session.
- Loads and resumes active sessions.
- Avoids stale updates when `sessionId` changes during a request.
- Skips automatic loading in embedded or preview mode.
- Handles empty, inactive, failed, and unmounted states.

### `useSSEHandler.test.ts`

- Consumes SSE streams and flushes batched chunks.
- Clears timers when a stream completes or fails.
- Distinguishes user aborts from recoverable interruptions.
- Retries only unfinished assistant messages.
- Handles empty streams and missing messages safely.

### `useNetworkRecovery.test.ts`

- Resumes unfinished sessions from the last assistant chunk.
- Aborts active connections when the network goes offline.
- Debounces `online`, `visibilitychange`, `focus`, and `pageshow` recovery.
- Handles back-forward cache restoration.
- Cleans event listeners and retry timers on unmount.

## Running Tests

From the `web` directory:

```bash
pnpm test --run
```

Run one suite by name:

```bash
pnpm test useChunkParser
pnpm test useSendContinue
pnpm test useSend
pnpm test useSessionManager
pnpm test useSSEHandler
pnpm test useNetworkRecovery
```

The tests use Vitest fake timers, mocked Fetch responses, async SSE iterators,
and stable mock store objects. When a test schedules timers, advance or drain
them explicitly to avoid order-dependent results.
