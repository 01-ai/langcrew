import React, { useEffect, useMemo, useState } from 'react';
import { ToolBriefRendererProps } from '..';
import { Markdown } from '@/components/Infra';
import { useTranslation } from '@/hooks/useTranslation';
import { HitlApprovalDecision, HitlApprovalResumeContent, UserInputChunk, UserInputQuestionType } from '@/types';
import eventBus from '@/utils/eventBus';
import { ToolIconCircle } from '../common/icons';
import PhoneHIL from '../common/PhoneHIL';
import useHumanInTheLoop from '../common/useHumanInTheLoop';
import { DynamicFormRenderer } from '@/components/Infra/DynamicForm';
import { useAgentStore } from '@/store';
import classNames from 'classnames';
import SingleSelectQuestion from './SingleSelectQuestion';
import MultiSelectQuestion from './MultiSelectQuestion';

const cardClass =
  'flex w-[400px] max-w-full flex-col items-start rounded-2xl border border-[#E9E9E9] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]';


const submitButtonClass =
  'relative flex h-10 w-full items-center justify-center overflow-hidden rounded-md border border-black bg-gradient-to-b from-[#333] to-[#222] px-4 text-[14px] font-medium leading-5 text-white shadow-[inset_0_-1.5px_1px_#000,inset_0_1.5px_1px_rgba(255,255,255,0.3)] transition-opacity';

const approvalCardClass =
  'flex w-[508px] max-w-full flex-col items-start gap-3 rounded-2xl border border-[#E9E9E9] bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.04)]';

const approvalPrimaryButtonClass =
  'relative flex h-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black bg-gradient-to-b from-[#333] to-[#222] px-4 text-[14px] font-medium leading-5 text-white shadow-[inset_0_-1.5px_1px_#000,inset_0_1.5px_1px_rgba(255,255,255,0.3)] transition-opacity';

const approvalSecondaryButtonClass =
  'flex h-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E9E9E9] bg-white px-4 text-[14px] font-medium leading-5 text-black transition-opacity';


const approvalInputClass =
  'h-10 w-full rounded-lg border border-[#E9E9E9] px-3 text-[14px] leading-5 text-black outline-none placeholder:text-[#CCC] disabled:opacity-40';

const getSubmitClass = (disabled: boolean) =>
  classNames(submitButtonClass, {
    'cursor-pointer': !disabled,
    'cursor-not-allowed opacity-40': disabled,
  });


type ResumeContent = string | boolean | string[] | HitlApprovalResumeContent;

const UserInputBriefRenderer: React.FC<ToolBriefRendererProps> = ({ message }) => {
  const { t } = useTranslation();
  const { instanceId, pipelineMessages, renderHitlApproval } = useAgentStore();

  const userInputMessage = message as UserInputChunk;
  const interruptData = userInputMessage.detail?.interrupt_data;

  const [formLoading, setFormLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [approvalMessage, setApprovalMessage] = useState('');

  const { showTakeOverBrowser, showTakeOverPhone, userInputable } = useHumanInTheLoop(userInputMessage);
  const interactive = userInputable && !submitted;

  const options = useMemo(() => {
    return interruptData?.options || userInputMessage.detail?.options || [];
  }, [interruptData?.options, userInputMessage.detail?.options]);

  const questionType: UserInputQuestionType = useMemo(() => {
    if (interruptData?.question_type) {
      return interruptData.question_type;
    }
    return options.length > 0 ? 'single_select' : 'text';
  }, [interruptData?.question_type, options.length]);

  const prompt = userInputMessage.content || interruptData?.question || '';

  // Find the assistant MessageItem that contains the current user_input message.
  // The following user MessageItem contains the submitted answer.
  const submittedContent = useMemo(() => {
    const parentIndex = pipelineMessages.findIndex(
      (item) => item.role === 'assistant' && item.messages.some((msg) => msg.id === userInputMessage.id),
    );
    if (parentIndex < 0) return undefined;
    const nextItem = pipelineMessages[parentIndex + 1];
    if (nextItem?.role !== 'user') return undefined;
    return nextItem.messages[0]?.content;
  }, [pipelineMessages, userInputMessage.id]);

  useEffect(() => {
    setSubmitted(false);
    setTextValue('');
    setApprovalMessage('');
  }, [userInputMessage.id]);

  const emitResponse = (displayContent: string, resumeContent?: ResumeContent) => {
    if (!interactive) return;

    setSubmitted(true);
    eventBus.emit(`call_send_${instanceId}`, {
      content: displayContent,
      ...(resumeContent !== undefined ? { resumeContent } : {}),
    });
  };

  const actionRequests = interruptData?.action_requests || [];

  const buildApprovalResumeContent = (
    decisionType: HitlApprovalDecision['type'],
    message?: string,
  ): HitlApprovalResumeContent => ({
    decisions: actionRequests.map(() => {
      if (decisionType === 'reject') {
        const trimmedMessage = message?.trim();
        return {
          type: 'reject',
          ...(trimmedMessage ? { message: trimmedMessage } : {}),
        };
      }
      return { type: 'approve' };
    }),
  });

  const isDecisionAllowed = (decisionType: HitlApprovalDecision['type']) => {
    if (!interruptData?.review_configs?.length) return true;

    return actionRequests.every((request) => {
      const reviewConfig = interruptData.review_configs?.find((config) => config.action_name === request.name);
      return !reviewConfig || reviewConfig.allowed_decisions.includes(decisionType);
    });
  };

  const handleFormSubmit = async (data: any) => {
    if (!interactive) return;

    setFormLoading(true);
    try {
      emitResponse(JSON.stringify(data));
    } finally {
      setFormLoading(false);
    }
  };

  const renderPrompt = (className?: string) => {
    if (!prompt) return null;
    return <Markdown content={prompt} className={classNames('text-[16px] leading-5 text-black', className)} />;
  };

  const renderApprovalPrompt = () => {
    if (!prompt) return null;
    return <Markdown content={prompt} className="w-full text-[16px] leading-7 text-black" />;
  };

  const renderSubmitButton = ({
    disabled,
    onClick,
    label = t('form.submit.button'),
  }: {
    disabled: boolean;
    onClick: () => void;
    label?: string;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick} className={getSubmitClass(disabled)}>
      {label}
    </button>
  );

  const renderTextQuestion = () => {
    const submitDisabled = !interactive || textValue.trim().length === 0;

    return (
      <div className={classNames(cardClass, 'gap-6')}>
        <div className="flex w-full flex-col gap-4">
          {renderPrompt('font-medium')}
          <input
            value={textValue}
            disabled={!interactive}
            onChange={(event) => setTextValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !submitDisabled) {
                emitResponse(textValue);
              }
            }}
            placeholder={t('user_input.text.placeholder')}
            className="h-11 w-full rounded-lg border border-[#E9E9E9] px-4 text-[14px] leading-5 text-black outline-none placeholder:text-[#CCC] disabled:opacity-40"
          />
        </div>
        {renderSubmitButton({
          disabled: submitDisabled,
          onClick: () => emitResponse(textValue),
        })}
      </div>
    );
  };

  const renderApprovalQuestion = () => {
    const labels = options.length === 2 ? options : [t('button.confirm'), t('button.cancel')];
    const [approveLabel, rejectLabel] = labels;
    const approvalButtonDisabledClass = interactive ? 'cursor-pointer' : 'cursor-not-allowed opacity-40';

    return (
      <div data-testid="user-input-approval-card" className={approvalCardClass}>
        {renderApprovalPrompt()}
        <div data-testid="user-input-approval-actions" className="flex w-full items-center justify-end gap-2">
          <button
            type="button"
            disabled={!interactive}
            onClick={() => emitResponse(approveLabel, approveLabel)}
            className={classNames(approvalPrimaryButtonClass, approvalButtonDisabledClass)}
          >
            {approveLabel}
          </button>
          <button
            type="button"
            disabled={!interactive}
            onClick={() => emitResponse(rejectLabel, rejectLabel)}
            className={classNames(approvalSecondaryButtonClass, approvalButtonDisabledClass)}
          >
            {rejectLabel}
          </button>
        </div>
      </div>
    );
  };

  const renderHitlApprovalRequest = () => {
    const description = actionRequests
      .map((request) => request.description)
      .filter(Boolean)
      .join('\n\n');
    const approveLabel = t('hitl.decision.approve');
    const rejectLabel = t('hitl.decision.reject');
    const approveDisabled = !interactive || !isDecisionAllowed('approve');
    const rejectDisabled = !interactive || !isDecisionAllowed('reject');
    const buildRejectMessage = () => approvalMessage.trim() || undefined;
    const submitCustomReject = () => {
      const message = buildRejectMessage();
      if (rejectDisabled || !message) return;
      emitResponse(message, buildApprovalResumeContent('reject', message));
    };
    const submitReject = () => {
      if (rejectDisabled) return;
      const message = approvalMessage.trim();
      emitResponse(rejectLabel, buildApprovalResumeContent('reject', message || undefined));
    };

    const defaultRenderer = (
      <div data-testid="hitl-approval-card" className={approvalCardClass}>
        {description ? (
          <Markdown content={description} className="w-full text-[16px] leading-7 text-black" />
        ) : (
          renderApprovalPrompt()
        )}
        <div data-testid="hitl-approval-actions" className="flex w-full items-center justify-end gap-2">
          <button
            type="button"
            disabled={approveDisabled}
            onClick={() => emitResponse(approveLabel, buildApprovalResumeContent('approve'))}
            className={classNames(approvalPrimaryButtonClass, {
              'cursor-pointer': !approveDisabled,
              'cursor-not-allowed opacity-40': approveDisabled,
            })}
          >
            {approveLabel}
          </button>
          <button
            type="button"
            disabled={rejectDisabled}
            onClick={submitReject}
            className={classNames(approvalSecondaryButtonClass, {
              'cursor-pointer': !rejectDisabled,
              'cursor-not-allowed opacity-40': rejectDisabled,
            })}
          >
            {rejectLabel}
          </button>
        </div>
        <input
          value={approvalMessage}
          disabled={rejectDisabled}
          onChange={(event) => setApprovalMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              submitCustomReject();
            }
          }}
          placeholder={t('user_input.approval.custom.placeholder')}
          className={approvalInputClass}
        />
      </div>
    );

    if (!renderHitlApproval) {
      return defaultRenderer;
    }

    return renderHitlApproval({
      message: userInputMessage,
      actionRequests,
      interactive,
      approveDisabled,
      rejectDisabled,
      onApprove: () => {
        if (approveDisabled) return;
        emitResponse(approveLabel, buildApprovalResumeContent('approve'));
      },
      onReject: (message) => {
        if (rejectDisabled) return;
        const trimmedMessage = message?.trim();
        emitResponse(rejectLabel, buildApprovalResumeContent('reject', trimmedMessage || undefined));
      },
      defaultRenderer,
    });
  };

  const renderSingleSelectQuestion = () => (
    <SingleSelectQuestion
      options={options}
      interactive={interactive}
      prompt={renderPrompt('font-medium')}
      initialValue={submittedContent}
      onSubmit={(value) => emitResponse(value)}
    />
  );

  const renderMultiSelectQuestion = () => {
    // Restore selected options from submittedContent. Prefer JSON for messages stored
    // as serialized arrays, then fall back to splitting on ", ".
    const initialValues = submittedContent
      ? (() => {
          try {
            const parsed = JSON.parse(submittedContent);
            if (Array.isArray(parsed)) {
              return options.filter((opt) => parsed.includes(opt));
            }
          } catch (_) {
            // not JSON, fall through to split
          }
          return options.filter((opt) => submittedContent.split(', ').includes(opt));
        })()
      : undefined;
    return (
      <MultiSelectQuestion
        options={options}
        interactive={interactive}
        prompt={renderPrompt('font-medium')}
        initialValues={initialValues}
        onSubmit={(values) => emitResponse(values.join(', ') || t('user_input.none_selected'), values)}
      />
    );
  };

  const renderUserInput = () => {
    const formSchema = interruptData?.form_schema;
    if (formSchema) {
      return (
        <div className={classNames(cardClass, 'w-[500px] gap-3')}>
          {renderPrompt()}
          <DynamicFormRenderer
            schema={formSchema}
            onSubmit={handleFormSubmit}
            loading={formLoading}
            disabled={!interactive}
          />
        </div>
      );
    }

    if (showTakeOverBrowser) {
      return (
        <div className={classNames(cardClass, 'w-[500px] flex-row items-center justify-between gap-3')}>
          {renderPrompt()}
          <a
            href={interruptData?.intervention_info?.intervention_url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              if (!interactive) {
                event.preventDefault();
              }
            }}
            className={classNames(
              'whitespace-nowrap rounded-md px-6 py-2 text-[14px] text-white',
              interactive ? 'cursor-pointer bg-black' : 'cursor-not-allowed bg-gray-700',
            )}
          >
            {t('task.user_input.take_over_browser.button')}
          </a>
        </div>
      );
    }

    if (showTakeOverPhone) {
      return <PhoneHIL userInputable={interactive} />;
    }

    if (actionRequests.length > 0) {
      return renderHitlApprovalRequest();
    }

    if (questionType === 'approval') {
      return renderApprovalQuestion();
    }

    if (questionType === 'single_select') {
      return renderSingleSelectQuestion();
    }

    if (questionType === 'multi_select') {
      return renderMultiSelectQuestion();
    }

    return renderTextQuestion();
  };

  return (
    <>
      {renderUserInput()}

      <div className="flex w-fit items-center gap-1 rounded-2xl bg-[#FFEDC9] px-3 py-1.5 text-[14px] text-[#E07801]">
        <ToolIconCircle />
        <div>{t('user.input.brief')}</div>
      </div>
    </>
  );
};;;;;;;

export default UserInputBriefRenderer;
