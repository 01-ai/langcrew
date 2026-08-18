import { useCallback, useState } from 'react';
import { useStore } from 'zustand';
import { useAgentStoreApi, useRequestClient } from '@/store';
import type { ConversationFeedback, FeedbackType } from '@/types';
import { isConversationFeedback, isFeedbackPermissionError } from '../utils';

const resolveSessionId = (state: {
  sessionId?: string | null;
  sessionInfo?: { session_id?: string } | null;
}) => state.sessionId || state.sessionInfo?.session_id || '';

export const useResponseFeedback = (responseId?: string) => {
  const storeApi = useAgentStoreApi();
  const requestClient = useRequestClient();
  const [modalType, setModalType] = useState<FeedbackType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const feedback = useStore(storeApi, (state) => (responseId ? state.feedbackMap[responseId] : undefined));

  const submit = useCallback(
    async (
      type: FeedbackType,
      reasonCodes: string[] = [],
      comment: string | null = null,
      options?: { showLoading?: boolean },
    ) => {
      const state = storeApi.getState();
      const sessionId = resolveSessionId(state);
      if (!sessionId || !responseId) {
        return;
      }
      const previous = state.feedbackMap[responseId];
      const next: ConversationFeedback = {
        feedback_type: type,
        reason_codes: reasonCodes,
        comment,
      };
      state.setFeedback(responseId, next);
      if (options?.showLoading) {
        setSubmitting(true);
      }
      try {
        const data = await requestClient.session.submitFeedback(sessionId, responseId, next);
        if (isConversationFeedback(data)) {
          storeApi.getState().setFeedback(responseId, data);
        }
      } catch (error) {
        if (isFeedbackPermissionError(error)) {
          storeApi.getState().setFeedbackMap({});
          setModalType(null);
        } else if (previous) {
          storeApi.getState().setFeedback(responseId, previous);
        } else {
          storeApi.getState().clearFeedback(responseId);
        }
        throw error;
      } finally {
        if (options?.showLoading) {
          setSubmitting(false);
        }
      }
    },
    [requestClient, responseId, storeApi],
  );

  const remove = useCallback(async () => {
    const state = storeApi.getState();
    const sessionId = resolveSessionId(state);
    if (!sessionId || !responseId) {
      return;
    }
    const previous = state.feedbackMap[responseId];
    state.clearFeedback(responseId);
    setModalType(null);
    try {
      await requestClient.session.deleteFeedback(sessionId, responseId);
    } catch (error) {
      if (isFeedbackPermissionError(error)) {
        storeApi.getState().setFeedbackMap({});
      } else if (previous) {
        storeApi.getState().setFeedback(responseId, previous);
      }
      throw error;
    }
  }, [requestClient, responseId, storeApi]);

  const onToggle = useCallback(
    async (type: FeedbackType) => {
      if (!responseId) {
        return;
      }
      try {
        if (feedback?.feedback_type === type) {
          await remove();
          return;
        }
        setModalType(type);
        await submit(type, [], null);
      } catch {
        setModalType(null);
      }
    },
    [feedback?.feedback_type, remove, responseId, submit],
  );

  const onSubmitReasons = useCallback(
    async (reasonCodes: string[], comment: string | null) => {
      if (!modalType) {
        return;
      }
      try {
        await submit(modalType, reasonCodes, comment, { showLoading: true });
        setModalType(null);
      } catch {
        // Keep the modal open so the user can retry with the same response.
      }
    },
    [modalType, submit],
  );

  const onCloseModal = useCallback(() => {
    setModalType(null);
  }, []);

  return {
    feedback,
    modalType,
    submitting,
    onToggle,
    onSubmitReasons,
    onCloseModal,
  };
};
