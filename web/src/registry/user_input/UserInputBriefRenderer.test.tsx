import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import UserInputBriefRenderer from './UserInputBriefRenderer';
import { UserInputChunk } from '@/types';
import type { RenderHitlApproval } from '@/types/agentx';

const mocks = vi.hoisted(() => ({
  emit: vi.fn(),
  storeState: {
    instanceId: 'page',
    pipelineMessages: [],
    sessionInfo: {
      status: 'ACTIVE',
    },
    renderHitlApproval: undefined as RenderHitlApproval | undefined,
  },
}));

vi.mock('@/utils/eventBus', () => ({
  default: {
    emit: mocks.emit,
  },
}));

vi.mock('@/store', () => ({
  useAgentStore: () => mocks.storeState,
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'button.confirm': 'Confirm',
        'button.cancel': 'Cancel',
        'form.submit.button': 'Submit',
        'user.input.brief': 'Will continue after your reply',
        'user_input.text.placeholder': 'Enter your reply',
        'user_input.custom.placeholder': 'Other, please enter...',
        'hitl.decision.approve': 'approve',
        'hitl.decision.reject': 'reject',
        'user_input.approval.custom.placeholder': 'Enter rejection reason',
        'user_input.none_selected': 'No options selected',
        'task.user_input.take_over_browser.button': 'Click to Open Browser',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/components/Infra', () => ({
  Markdown: ({ content, className }: { content?: string; className?: string }) => (
    <div className={className}>{content}</div>
  ),
}));

vi.mock('@/components/Infra/DynamicForm', () => ({
  DynamicFormRenderer: ({ onSubmit, disabled }: { onSubmit: (data: any) => void; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={() => onSubmit({ site_type: 'docs' })}>
      Dynamic Form
    </button>
  ),
}));

vi.mock('../common/icons', () => ({
  ToolIconCircle: () => <span data-testid="tool-icon" />,
}));

vi.mock('./assets/custom.svg?react', () => ({
  default: () => <span data-testid="custom-input-icon" />,
}));

vi.mock('./assets/send.svg?react', () => ({
  default: () => <span data-testid="send-icon" />,
}));

const createMessage = (overrides: Partial<UserInputChunk> = {}): UserInputChunk => {
  const base: UserInputChunk = {
    id: 'user-input-1',
    role: 'assistant',
    type: 'user_input',
    content: 'Which mode should I use?',
    isLast: true,
    detail: {
      interrupt_data: {
        type: 'user_input',
        question: 'Which mode should I use?',
      },
    },
  };

  return {
    ...base,
    ...overrides,
    detail: {
      ...base.detail,
      ...overrides.detail,
      interrupt_data: {
        ...base.detail?.interrupt_data,
        ...overrides.detail?.interrupt_data,
      },
    },
  } as UserInputChunk;
};

const renderMessage = (overrides?: Partial<UserInputChunk>) => {
  return render(<UserInputBriefRenderer message={createMessage(overrides) as any} />);
};

describe('UserInputBriefRenderer', () => {
  afterEach(() => {
    mocks.emit.mockClear();
    mocks.storeState.instanceId = 'page';
    mocks.storeState.pipelineMessages = [];
    mocks.storeState.sessionInfo.status = 'ACTIVE';
    mocks.storeState.renderHitlApproval = undefined;
  });

  it('submits text answers', () => {
    renderMessage({
      detail: {
        interrupt_data: {
          type: 'user_input',
          question_type: 'text',
          question: 'What should I do?',
        },
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Enter your reply'), {
      target: { value: 'Use the balanced mode' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'Use the balanced mode',
    });
  });

  it('renders approval as the compact confirmation card and submits the first action as true', () => {
    renderMessage({
      detail: {
        interrupt_data: {
          type: 'user_input',
          question_type: 'approval',
          question: 'Continue?',
          options: ['Allow', 'Deny'],
        },
      },
    });

    const card = screen.getByTestId('user-input-approval-card');
    const actions = screen.getByTestId('user-input-approval-actions');

    expect(card.className).toContain('w-[508px]');
    expect(card.className).toContain('p-3');
    expect(card.className).toContain('gap-3');
    expect(actions.className).toContain('justify-end');
    expect(screen.queryByPlaceholderText('Other, please enter...')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Allow' }));

    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'Allow',
      resumeContent: 'Allow',
    });
  });

  it('submits the second approval action as false', () => {
    renderMessage({
      detail: {
        interrupt_data: {
          type: 'user_input',
          question_type: 'approval',
          question: 'Continue?',
          options: ['Allow', 'Deny'],
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));

    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'Deny',
      resumeContent: 'Deny',
    });
  });

  it('uses localized confirmation labels for approval fallback labels', () => {
    renderMessage({
      detail: {
        interrupt_data: {
          type: 'user_input',
          question_type: 'approval',
          question: 'Continue?',
        },
      },
    });

    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'Cancel',
      resumeContent: 'Cancel',
    });
  });

  it('renders HITL approval action description, two buttons, and a custom message input', () => {
    renderMessage({
      content: 'User input required',
      detail: {
        interrupt_data: {
          action_requests: [
            {
              name: 'update_requirement_fields',
              args: { fields: [] },
              description: 'Are project needs fields updated?',
            },
          ],
          review_configs: [
            {
              action_name: 'update_requirement_fields',
              allowed_decisions: ['approve', 'reject'],
            },
          ],
        },
      },
    });

    expect(screen.getByTestId('hitl-approval-card')).not.toBeNull();
    expect(screen.getByText('Are project needs fields updated?')).not.toBeNull();
    expect(screen.queryByText(/"fields"/)).toBeNull();
    expect(screen.getByRole('button', { name: 'approve' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'reject' })).not.toBeNull();
    expect(screen.getByPlaceholderText('Enter rejection reason')).not.toBeNull();
    expect(screen.getByTestId('hitl-approval-actions').querySelectorAll('button')).toHaveLength(2);
  });

  it('renders a custom HITL approval card and keeps approval submission inside AgentX', () => {
    const renderHitlApproval = vi.fn<RenderHitlApproval>(
      ({ actionRequests, approveDisabled, rejectDisabled, onApprove, onReject }) => (
        <div data-testid="custom-hitl-approval-card">
          <span>{actionRequests[0]?.name}</span>
          <button type="button" disabled={approveDisabled} onClick={onApprove}>
            Custom approve
          </button>
          <button type="button" disabled={rejectDisabled} onClick={() => onReject('Needs revision')}>
            Custom reject
          </button>
        </div>
      ),
    );
    mocks.storeState.renderHitlApproval = renderHitlApproval;

    renderMessage({
      content: 'User input required',
      detail: {
        interrupt_data: {
          action_requests: [
            {
              name: 'update_requirement_fields',
              args: { fields: [{ field_key: 'budget', value_text: '100' }] },
              description: 'Update requirement fields?',
            },
          ],
          review_configs: [
            {
              action_name: 'update_requirement_fields',
              allowed_decisions: ['approve', 'reject'],
            },
          ],
        },
      },
    });

    expect(screen.getByTestId('custom-hitl-approval-card')).not.toBeNull();
    expect(screen.queryByTestId('hitl-approval-card')).toBeNull();
    expect(renderHitlApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        actionRequests: [expect.objectContaining({ name: 'update_requirement_fields' })],
        interactive: true,
        approveDisabled: false,
        rejectDisabled: false,
        onApprove: expect.any(Function),
        onReject: expect.any(Function),
        defaultRenderer: expect.anything(),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Custom reject' }));

    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'reject',
      resumeContent: {
        decisions: [{ type: 'reject', message: 'Needs revision' }],
      },
    });
  });

  it('submits HITL approval decisions from the approve button', () => {
    renderMessage({
      content: 'User input required',
      detail: {
        interrupt_data: {
          action_requests: [
            {
              name: 'submit_artifact',
              description: 'Are the products agreed to be submitted?',
            },
          ],
          review_configs: [
            {
              action_name: 'submit_artifact',
              allowed_decisions: ['approve', 'reject'],
            },
          ],
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'approve' }));

    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'approve',
      resumeContent: {
        decisions: [{ type: 'approve' }],
      },
    });
  });

  it('submits HITL rejection decisions from the reject button', () => {
    renderMessage({
      content: 'User input required',
      detail: {
        interrupt_data: {
          action_requests: [
            {
              name: 'submit_artifact',
              description: 'Are the products agreed to be submitted?',
            },
          ],
          review_configs: [
            {
              action_name: 'submit_artifact',
              allowed_decisions: ['approve', 'reject'],
            },
          ],
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'reject' }));

    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'reject',
      resumeContent: {
        decisions: [{ type: 'reject' }],
      },
    });
  });

  it('treats HITL custom input as a rejection message', () => {
    renderMessage({
      content: 'User input required',
      detail: {
        interrupt_data: {
          action_requests: [
            {
              name: 'update_requirement_fields',
              description: 'Are project needs fields updated?',
            },
          ],
          review_configs: [
            {
              action_name: 'update_requirement_fields',
              allowed_decisions: ['approve', 'reject'],
            },
          ],
        },
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Enter rejection reason'), {
      target: { value: 'Please revise first' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Enter rejection reason'), {
      key: 'Enter',
      code: 'Enter',
    });

    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'Please revise first',
      resumeContent: {
        decisions: [{ type: 'reject', message: 'Please revise first' }],
      },
    });
  });

  it('submits one HITL decision per action in order', () => {
    renderMessage({
      content: 'User input required',
      detail: {
        interrupt_data: {
          action_requests: [
            {
              name: 'update_requirement_fields',
              description: 'Are project needs fields updated?',
            },
            {
              name: 'submit_artifact',
              description: 'Are the products agreed to be submitted?',
            },
          ],
          review_configs: [
            {
              action_name: 'update_requirement_fields',
              allowed_decisions: ['approve', 'reject'],
            },
            {
              action_name: 'submit_artifact',
              allowed_decisions: ['approve', 'reject'],
            },
          ],
        },
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Enter rejection reason'), {
      target: { value: 'The second operation is not agreed.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'reject' }));

    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'reject',
      resumeContent: {
        decisions: [
          { type: 'reject', message: 'The second operation is not agreed.' },
          { type: 'reject', message: 'The second operation is not agreed.' },
        ],
      },
    });
  });

  it('submits single-select options from interrupt_data options immediately on click', () => {
    renderMessage({
      detail: {
        interrupt_data: {
          type: 'user_input',
          question_type: 'single_select',
          question: 'Which mode should I use?',
          options: ['Fast', 'Balanced', 'Accurate'],
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Balanced' }));
    
    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'Balanced',
    });
  });

  it('supports custom answers for single-select questions', () => {
    renderMessage({
      detail: {
        interrupt_data: {
          type: 'user_input',
          question_type: 'single_select',
          question: 'Which mode should I use?',
          options: ['Fast', 'Balanced', 'Accurate'],
        },
      },
    });

    fireEvent.change(screen.getByPlaceholderText('Other, please enter...'), {
      target: { value: 'Use my own mode' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'Use my own mode',
    });
  });

  it('submits multi-select choices as an array resume value', () => {
    renderMessage({
      detail: {
        interrupt_data: {
          type: 'user_input',
          question_type: 'multi_select',
          question: 'Which modes are acceptable?',
          options: ['Fast', 'Balanced', 'Accurate'],
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Fast' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accurate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'Fast, Accurate',
      resumeContent: ['Fast', 'Accurate'],
    });
  });

  it('allows submitting an empty multi-select response', () => {
    renderMessage({
      detail: {
        interrupt_data: {
          type: 'user_input',
          question_type: 'multi_select',
          question: 'Which modes are acceptable?',
          options: ['Fast', 'Balanced'],
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'No options selected',
      resumeContent: [],
    });
  });

  it('treats legacy option-only payloads as single-select and submits immediately on click', () => {
    renderMessage({
      detail: {
        options: ['Fast', 'Balanced'],
        interrupt_data: {
          type: 'user_input',
          question: 'Which mode should I use?',
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Fast' }));
    
    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: 'Fast',
    });
  });

  it('disables input when the interrupt is inactive', () => {
    renderMessage({
      isLast: false,
      detail: {
        interrupt_data: {
          type: 'user_input',
          question_type: 'single_select',
          question: 'Which mode should I use?',
          options: ['Fast', 'Balanced'],
        },
      },
    });

    const option = screen.getByRole('button', { name: 'Fast' }) as HTMLButtonElement;

    expect(option.disabled).toBe(true);
    fireEvent.click(option);
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it('renders dynamic forms before simple option UIs', () => {
    renderMessage({
      detail: {
        options: ['Legacy option'],
        interrupt_data: {
          type: 'dynamic_form',
          question_type: 'single_select',
          question: 'Please fill out the form',
          options: ['Interrupt option'],
          form_schema: {
            type: 'object',
            properties: {
              site_type: {
                type: 'string',
                title: 'Website type',
              },
            },
          },
        },
      },
    });

    expect(screen.queryByRole('button', { name: 'Legacy option' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Interrupt option' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Dynamic Form' }));

    expect(mocks.emit).toHaveBeenCalledWith('call_send_page', {
      content: JSON.stringify({ site_type: 'docs' }),
    });
  });
});
