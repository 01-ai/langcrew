# Debugging Unexpected `send-continue` Requests

`send-continue` resumes a session after an interrupted stream. An unexpected request usually means that one of the recovery paths considered the last assistant message unfinished.

## Call Paths

The production call sites are:

- `core/useSend.ts`: resumes after a send response closes without a terminal message.
- `core/useSendContinue.ts`: retries a failed or incomplete continuation.
- `network/useNetworkRecovery.ts`: resumes after connectivity, focus, visibility, or bfcache recovery.

`core/useSSEHandler.ts` detects stream completion and invokes the retry callback supplied by these hooks.

## Diagnostic Sequence

1. Locate the `[sendContinue]` log and inspect its stack trace, retry count, timestamp, and `chunk_id`.
2. Inspect the last non-synthetic chunk. A completed assistant response must include the expected terminal state.
3. Confirm that only one recovery source fired. Online, focus, visibility, and `pageshow` events are debounced, but multiple hook instances can still indicate an ownership problem.
4. Check whether a previous retry timer survived a session change or component unmount.
5. Confirm that `AbortError` is treated as an intentional interruption and that offline recovery waits for the online event.
6. Verify that `client_tool_result` delivery does not remove or replace the assistant chunk used as the continuation anchor.

## Useful Breakpoints

Set breakpoints at each `sendContinue()` call and in:

- `useSendContinue` before filtering synthetic chunks
- the SSE completion callback
- the maximum-retry handler
- `useNetworkRecovery` before its debounce timer is created
- session cleanup where retry timers and `AbortController` instances are cleared

## Common Causes

- The stream closed without a `finish_reason` or equivalent terminal chunk.
- A stale hook instance still owns a timer.
- The active session changed while a client tool was running.
- A visibility or focus event resumed a session that had already completed.
- Synthetic status chunks obscured the last real assistant chunk.

## Verification

Run the focused suites before the full test suite:

```bash
pnpm test --run src/hooks/useChat/core/__tests__/useSendContinue.test.ts
pnpm test --run src/hooks/useChat/network/__tests__/useNetworkRecovery.test.ts
pnpm test --run
```

Validate both successful continuation and the maximum-retry path. Confirm that session changes and unmounts clear timers and abort active requests.
