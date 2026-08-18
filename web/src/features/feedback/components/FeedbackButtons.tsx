import React from 'react';
import classNames from 'classnames';
import LikeIcon from '@/assets/svg/feedback/like.svg?react';
import LikeFilledIcon from '@/assets/svg/feedback/like-filled.svg?react';
import DislikeIcon from '@/assets/svg/feedback/dislike.svg?react';
import DislikeFilledIcon from '@/assets/svg/feedback/dislike-filled.svg?react';
import { useTranslation } from '@/hooks/useTranslation';
import type { FeedbackType } from '@/types';
import { useResponseFeedback } from '../hooks/useResponseFeedback';
import FeedbackModal from './FeedbackModal';

interface FeedbackButtonsProps {
  responseId?: string;
}

const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({ responseId }) => {
  const { t } = useTranslation();
  const { feedback, modalType, submitting, onToggle, onSubmitReasons, onCloseModal } = useResponseFeedback(responseId);

  const renderButton = (type: FeedbackType) => {
    const selected = (modalType ?? feedback?.feedback_type) === type;
    const label = type === 'like' ? t('feedback.like') : t('feedback.dislike');
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={selected}
        className={classNames(
          'flex h-6 w-6 items-center justify-center rounded-md border-0 bg-transparent p-0 cursor-pointer',
          selected ? 'text-[#1a1a1a]' : 'text-[#8c8c8c] hover:text-[#1a1a1a]',
        )}
        onClick={() => {
          void onToggle(type);
        }}
      >
        {type === 'like' ? (
          selected ? (
            <LikeFilledIcon key="like-filled" className="size-4" data-testid="like-filled-icon" />
          ) : (
            <LikeIcon key="like" className="size-4" data-testid="like-icon" />
          )
        ) : selected ? (
          <DislikeFilledIcon key="dislike-filled" className="size-4" data-testid="dislike-filled-icon" />
        ) : (
          <DislikeIcon key="dislike" className="size-4" data-testid="dislike-icon" />
        )}
      </button>
    );
  };

  return (
    <>
      <div className="ml-3 flex items-center gap-1">
        {renderButton('like')}
        {renderButton('dislike')}
      </div>
      {modalType ? (
        <FeedbackModal
          open
          feedbackType={modalType}
          initialReasonCodes={feedback?.feedback_type === modalType ? feedback.reason_codes : []}
          initialComment={feedback?.feedback_type === modalType ? feedback.comment : null}
          confirmLoading={submitting}
          onCancel={onCloseModal}
          onSubmit={({ reason_codes, comment }) => {
            void onSubmitReasons(reason_codes, comment);
          }}
        />
      ) : null}
    </>
  );
};

export default FeedbackButtons;
