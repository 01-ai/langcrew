import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Home from './index';
import { AgentStoreProvider } from '@/store';

vi.mock('@/components/Agent/Chatbot/Sender', () => ({
  default: () => <div data-testid="mock-sender" />,
}));

vi.mock('@/components/Agent/Chatbot/Welcome', () => ({
  default: () => <div data-testid="mock-welcome" />,
}));

vi.mock('@/components/Agent/Chatbot/ChatTitle', () => ({
  ChatTitle: () => <div data-testid="mock-chat-title" />,
}));

vi.mock('@/components/Agent/Chatbot/ChatFiles', () => ({
  ChatFiles: () => <div data-testid="mock-chat-files" />,
}));

const renderHome = (props: React.ComponentProps<typeof Home> = {}) => {
  return render(
    <AgentStoreProvider instanceKey="page-home-layout-test" agentId="home-layout-test">
      <Home headerNode={<div data-testid="home-header" />} {...props} />
    </AgentStoreProvider>,
  );
};

describe('Home', () => {
  it('applies custom layout class names to home, content, and sender containers', () => {
    const { container } = renderHome({
      homeClassName: 'custom-home',
      homeContentClassName: 'custom-content',
      homeSenderClassName: 'custom-sender',
      footerNode: <div data-testid="home-footer" />,
    });

    const home = container.firstElementChild;
    const content = screen.getByTestId('home-header').parentElement;
    const sender = screen.getByTestId('mock-sender').parentElement;

    expect(home?.classList.contains('custom-home')).toBe(true);
    expect(home?.classList.contains('h-full')).toBe(true);
    expect(home?.classList.contains('py-14')).toBe(false);
    expect(home?.hasAttribute('style')).toBe(false);
    expect(content?.classList.contains('custom-content')).toBe(true);
    expect(content?.classList.contains('max-w-[760px]')).toBe(true);
    expect(content?.classList.contains('gap-[60px]')).toBe(false);
    expect(content?.classList.contains('justify-center')).toBe(false);
    expect(sender?.classList.contains('custom-sender')).toBe(true);
    expect(sender?.classList.contains('w-full')).toBe(true);
    expect(screen.getByTestId('home-footer')).toBeTruthy();
  });

  it('keeps the default home padding and content gap when custom class names are absent', () => {
    const { container } = renderHome();

    const home = container.firstElementChild;
    const content = screen.getByTestId('home-header').parentElement;

    expect(home?.classList.contains('py-14')).toBe(true);
    expect(content?.classList.contains('gap-[60px]')).toBe(true);
    expect(content?.classList.contains('justify-center')).toBe(true);
  });
});
