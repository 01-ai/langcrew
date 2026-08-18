import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FeedbackButtons from './FeedbackButtons';

type FeedbackRecord = { feedback_type: 'like' | 'dislike'; reason_codes: string[]; comment: string | null };

type FeedbackState = {
  sessionId: string;
  sessionInfo?: { session_id?: string };
  feedbackMap: Record<string, FeedbackRecord>;
  setFeedback: (responseId: string, feedback: FeedbackRecord) => void;
  clearFeedback: (responseId: string) => void;
  setFeedbackMap: (feedbackMap: Record<string, FeedbackRecord>) => void;
};

const { storeApi, submitFeedback, deleteFeedback } = vi.hoisted(() => {
  const submitFeedback = vi.fn();
  const deleteFeedback = vi.fn();
  const listeners = new Set<(state: FeedbackState) => void>();
  const storeApi = {
    getState: () => state,
    setState: (partial: Partial<FeedbackState>) => {
      Object.assign(state, partial);
      listeners.forEach((listener) => listener(state));
    },
    subscribe: (listener: (state: FeedbackState) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getServerState: () => state,
  };
  const state: FeedbackState = {
    sessionId: 'session-1',
    sessionInfo: { session_id: 'session-1' },
    feedbackMap: {},
    setFeedback: (responseId, feedback) => {
      storeApi.setState({
        feedbackMap: {
          ...storeApi.getState().feedbackMap,
          [responseId]: feedback,
        },
      });
    },
    clearFeedback: (responseId) => {
      const next = { ...storeApi.getState().feedbackMap };
      delete next[responseId];
      storeApi.setState({ feedbackMap: next });
    },
    setFeedbackMap: (feedbackMap) => {
      storeApi.setState({ feedbackMap });
    },
  };

  return { storeApi, submitFeedback, deleteFeedback };
});

vi.mock('@/store', () => ({
  useAgentStoreApi: () => storeApi,
  useRequestClient: () => ({
    session: {
      submitFeedback,
      deleteFeedback,
    },
  }),
}));

vi.mock('@/assets/svg/feedback/like.svg?react', () => ({
  default: () => <span data-testid="like-icon" />,
}));
vi.mock('@/assets/svg/feedback/like-filled.svg?react', () => ({
  default: () => <span data-testid="like-filled-icon" />,
}));
vi.mock('@/assets/svg/feedback/dislike.svg?react', () => ({
  default: () => <span data-testid="dislike-icon" />,
}));
vi.mock('@/assets/svg/feedback/dislike-filled.svg?react', () => ({
  default: () => <span data-testid="dislike-filled-icon" />,
}));

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('FeedbackButtons', () => {
  beforeEach(() => {
    localStorage.setItem('i18nextLng', 'zh');
    storeApi.setState({
      sessionId: 'session-1',
      sessionInfo: { session_id: 'session-1' },
      feedbackMap: {},
    });
    submitFeedback.mockReset();
    deleteFeedback.mockReset();
    submitFeedback.mockResolvedValue({
      feedback_type: 'like',
      reason_codes: [],
      comment: null,
    });
    deleteFeedback.mockResolvedValue(true);
  });

  it('posts empty reasons and opens the modal on first like click', async () => {
    render(<FeedbackButtons responseId="resp-1" />);

    fireEvent.click(screen.getByRole('button', { name: '点赞' }));

    await waitFor(() => {
      expect(submitFeedback).toHaveBeenCalledWith('session-1', 'resp-1', {
        feedback_type: 'like',
        reason_codes: [],
        comment: null,
      });
    });
    expect(screen.getByText('提交反馈')).toBeTruthy();
    expect(screen.getByText('准确理解问题')).toBeTruthy();
    expect(screen.queryByText('未准确理解问题')).toBeNull();
    expect(screen.getByTestId('like-filled-icon')).toBeTruthy();
    expect(screen.queryByTestId('like-icon')).toBeNull();
    expect(screen.getByTestId('dislike-icon')).toBeTruthy();
  });

  it('posts feedback using sessionInfo.session_id when store sessionId is empty', async () => {
    storeApi.setState({
      sessionId: '',
      sessionInfo: { session_id: 'session-from-info' },
    });
    render(<FeedbackButtons responseId="resp-1" />);

    fireEvent.click(screen.getByRole('button', { name: '点踩' }));

    await waitFor(() => {
      expect(submitFeedback).toHaveBeenCalledWith('session-from-info', 'resp-1', {
        feedback_type: 'dislike',
        reason_codes: [],
        comment: null,
      });
    });
  });

  it('uses outline icons when unselected and filled icons when selected', () => {
    const { unmount } = render(<FeedbackButtons responseId="resp-1" />);

    expect(screen.getByTestId('like-icon')).toBeTruthy();
    expect(screen.getByTestId('dislike-icon')).toBeTruthy();
    expect(screen.queryByTestId('like-filled-icon')).toBeNull();
    expect(screen.queryByTestId('dislike-filled-icon')).toBeNull();
    unmount();

    storeApi.setState({
      feedbackMap: {
        'resp-1': { feedback_type: 'like', reason_codes: [], comment: null },
      },
    });
    render(<FeedbackButtons responseId="resp-1" />);

    expect(screen.getByTestId('like-filled-icon')).toBeTruthy();
    expect(screen.getByTestId('dislike-icon')).toBeTruthy();
    expect(screen.queryByTestId('like-icon')).toBeNull();
    expect(screen.queryByTestId('dislike-filled-icon')).toBeNull();
  });

  it('deletes feedback when clicking the selected button', async () => {
    storeApi.setState({
      feedbackMap: {
        'resp-1': { feedback_type: 'like', reason_codes: [], comment: null },
      },
    });
    render(<FeedbackButtons responseId="resp-1" />);

    fireEvent.click(screen.getByRole('button', { name: '点赞' }));

    await waitFor(() => {
      expect(deleteFeedback).toHaveBeenCalledWith('session-1', 'resp-1');
    });
    expect(submitFeedback).not.toHaveBeenCalled();
  });

  it('rolls back the selected icon when the first post fails', async () => {
    let rejectSubmit!: (error: Error) => void;
    submitFeedback.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectSubmit = reject;
        }),
    );
    render(<FeedbackButtons responseId="resp-1" />);

    fireEvent.click(screen.getByRole('button', { name: '点赞' }));

    await waitFor(() => {
      expect(screen.getByTestId('like-filled-icon')).toBeTruthy();
    });
    expect(screen.getByText('提交反馈')).toBeTruthy();

    rejectSubmit(new Error('submit failed'));

    await waitFor(() => {
      expect(screen.getByTestId('like-icon')).toBeTruthy();
    });
    expect(screen.queryByTestId('like-filled-icon')).toBeNull();
    expect(screen.queryByText('提交反馈')).toBeNull();
    expect(storeApi.getState().feedbackMap['resp-1']).toBeUndefined();
  });

  it('retries post after a failed first click instead of deleting', async () => {
    submitFeedback.mockRejectedValueOnce(new Error('submit failed'));
    submitFeedback.mockResolvedValueOnce({
      feedback_type: 'like',
      reason_codes: [],
      comment: null,
    });
    render(<FeedbackButtons responseId="resp-1" />);

    fireEvent.click(screen.getByRole('button', { name: '点赞' }));
    await waitFor(() => {
      expect(submitFeedback).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByTestId('like-icon')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: '点赞' }));
    await waitFor(() => {
      expect(submitFeedback).toHaveBeenCalledTimes(2);
    });
    expect(deleteFeedback).not.toHaveBeenCalled();
    expect(screen.getByTestId('like-filled-icon')).toBeTruthy();
  });

  it('rolls back to the previous selection when delete fails', async () => {
    storeApi.setState({
      feedbackMap: {
        'resp-1': { feedback_type: 'like', reason_codes: ['clear_response'], comment: null },
      },
    });
    let rejectDelete!: (error: Error) => void;
    deleteFeedback.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectDelete = reject;
        }),
    );
    render(<FeedbackButtons responseId="resp-1" />);

    fireEvent.click(screen.getByRole('button', { name: '点赞' }));

    await waitFor(() => {
      expect(screen.getByTestId('like-icon')).toBeTruthy();
    });
    expect(screen.queryByTestId('like-filled-icon')).toBeNull();

    rejectDelete(new Error('delete failed'));

    await waitFor(() => {
      expect(screen.getByTestId('like-filled-icon')).toBeTruthy();
    });
    expect(storeApi.getState().feedbackMap['resp-1']).toEqual({
      feedback_type: 'like',
      reason_codes: ['clear_response'],
      comment: null,
    });
  });
});
