import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MessageMetadataRenderer from './MessageMetadataRenderer';

vi.mock('@/assets/svg/sender/reference.svg?react', () => ({
  default: () => <span data-testid="reference-icon" />,
}));

describe('MessageMetadataRenderer', () => {
  it('renders the default reference card', () => {
    render(
      <MessageMetadataRenderer
        metadata={{
          reference: {
            id: 'todo-1',
            title: '确认脱敏样本',
            subtitle: '方案设计与验证',
          },
        }}
      />,
    );

    expect(screen.getByText('确认脱敏样本')).toBeTruthy();
    expect(screen.getByText('方案设计与验证')).toBeTruthy();
    expect(screen.getByTestId('reference-icon')).toBeTruthy();
  });

  it('allows custom rendering with the default renderer fallback', () => {
    const renderMessageMetadata = vi.fn(({ metadata, variant, defaultRenderer }) => {
      const reference = Array.isArray(metadata.reference) ? metadata.reference[0] : metadata.reference;

      return (
        <div>
          <div data-testid="custom-reference">
            {variant}:{reference?.title}
          </div>
          {defaultRenderer}
        </div>
      );
    });

    render(
      <MessageMetadataRenderer
        metadata={{
          reference: {
            id: 'todo-1',
            title: '自定义待办',
          },
        }}
        renderMessageMetadata={renderMessageMetadata}
      />,
    );

    expect(screen.getByTestId('custom-reference').textContent).toBe('message:自定义待办');
    expect(screen.getByText('自定义待办')).toBeTruthy();
    expect(renderMessageMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'message',
        defaultRenderer: expect.any(Object),
      }),
    );
  });

  it('calls onReferenceRemove in draft mode', () => {
    const onReferenceRemove = vi.fn();

    render(
      <MessageMetadataRenderer
        metadata={{
          reference: {
            id: 'todo-1',
            title: '草稿待办',
          },
        }}
        variant="draft"
        onReferenceRemove={onReferenceRemove}
      />,
    );

    fireEvent.click(screen.getByLabelText('Remove reference'));

    expect(onReferenceRemove).toHaveBeenCalledTimes(1);
  });

  it('lets custom renderers handle non-reference metadata', () => {
    render(
      <MessageMetadataRenderer
        metadata={{
          ticket: {
            id: 'ticket-1',
          },
        }}
        renderMessageMetadata={({ metadata, defaultRenderer }) => (
          <div data-testid="ticket-metadata">{metadata.ticket?.id || defaultRenderer}</div>
        )}
      />,
    );

    expect(screen.getByTestId('ticket-metadata').textContent).toBe('ticket-1');
  });
});
