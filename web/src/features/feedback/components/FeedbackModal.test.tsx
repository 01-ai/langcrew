import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FeedbackModal from './FeedbackModal';

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('FeedbackModal', () => {
  beforeEach(() => {
    localStorage.setItem('i18nextLng', 'zh');
  });

  it('shows only like reasons for like feedback', () => {
    render(
      <FeedbackModal open feedbackType="like" onCancel={vi.fn()} onSubmit={vi.fn()} />,
    );

    expect(screen.getByText('准确理解问题')).toBeTruthy();
    expect(screen.getByText('正确完成任务')).toBeTruthy();
    expect(screen.getByText('回答完整')).toBeTruthy();
    expect(screen.queryByText('未准确理解问题')).toBeNull();
    expect(screen.queryByText('结果存在错误')).toBeNull();
  });

  it('shows only dislike reasons for dislike feedback', () => {
    render(
      <FeedbackModal open feedbackType="dislike" onCancel={vi.fn()} onSubmit={vi.fn()} />,
    );

    expect(screen.getByText('未准确理解问题')).toBeTruthy();
    expect(screen.getByText('存在隐私风险')).toBeTruthy();
    expect(screen.queryByText('准确理解问题')).toBeNull();
  });

  it('disables confirm until a reason is selected', () => {
    render(
      <FeedbackModal open feedbackType="like" onCancel={vi.fn()} onSubmit={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: /确\s*定/ })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByText('准确理解问题'));
    expect(screen.getByRole('button', { name: /确\s*定/ })).toHaveProperty('disabled', false);
  });

  it('requires comment when other is selected', () => {
    const onSubmit = vi.fn();
    render(<FeedbackModal open feedbackType="like" onCancel={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('其他'));
    expect(screen.getByRole('button', { name: /确\s*定/ })).toHaveProperty('disabled', true);

    fireEvent.change(screen.getByPlaceholderText('欢迎分享您的想法'), {
      target: { value: '更多想法' },
    });
    expect(screen.getByRole('button', { name: /确\s*定/ })).toHaveProperty('disabled', false);

    fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }));
    expect(onSubmit).toHaveBeenCalledWith({
      reason_codes: ['other'],
      comment: '更多想法',
    });
  });
});
