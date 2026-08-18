import { describe, expect, it, vi } from 'vitest';
import { createAgentStore } from './agent';
import type { SessionInfo } from '@/types';

const session: SessionInfo = {
  session_id: 'session-123',
  title: 'Generated Title',
  status: 'ACTIVE',
};

describe('sessionInfo store', () => {
  it('setSessionInfo fires onSessionInfoChange', () => {
    const store = createAgentStore('session-info-change');
    const onSessionInfoChange = vi.fn();
    store.getState().setOnSessionInfoChange(onSessionInfoChange);

    store.getState().setSessionInfo(session);

    expect(store.getState().sessionInfo).toEqual(session);
    expect(onSessionInfoChange).toHaveBeenCalledTimes(1);
    expect(onSessionInfoChange).toHaveBeenCalledWith(session);
  });

  it('does not fire onSessionInfoChange when given undefined', () => {
    const store = createAgentStore('session-info-clear');
    const onSessionInfoChange = vi.fn();
    store.getState().setOnSessionInfoChange(onSessionInfoChange);
    store.getState().setSessionInfo(session);
    onSessionInfoChange.mockClear();

    store.getState().setSessionInfo(undefined);

    expect(store.getState().sessionInfo).toBeUndefined();
    expect(onSessionInfoChange).not.toHaveBeenCalled();
  });
});
