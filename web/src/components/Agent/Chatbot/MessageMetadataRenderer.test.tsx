import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MessageMetadataRenderer from './MessageMetadataRenderer';

vi.mock('@/assets/svg/sender/reference.svg?react', () => ({
  default: () => <svg data-testid="reference-icon" />,
}));

describe('MessageMetadataRenderer', () => {
  it('renders the default reference card', () => {
    render(
      <MessageMetadataRenderer
        metadata={{
          reference: {
            id: 'todo-1',
            title: 'Confirm the dissensitization sample.',
            subtitle: 'Solution design and validation',
          },
        }}
      />,
    );

    expect(screen.getByText('Confirm the dissensitization sample.')).toBeTruthy();
    expect(screen.getByText('Solution design and validation')).toBeTruthy();
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
            title: 'Custom To-do',
          },
        }}
        renderMessageMetadata={renderMessageMetadata}
      />,
    );

    expect(screen.getByTestId('custom-reference').textContent).toBe('message:Custom To-do');
    expect(screen.getByText('Custom To-do')).toBeTruthy();
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
            title: 'Draft to-do',
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
