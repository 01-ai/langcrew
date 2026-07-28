import { describe, expect, it } from 'vitest';
import { getImageUrlFromToolMessage, shouldRenderToolDetailWhilePending } from './imageTool';
import { MessageToolChunk } from '@/types';

describe('imageTool', () => {
  it('reads the image url from tool call params for pending view_image_url calls', () => {
    const message = {
      type: 'view_image_url',
      detail: {
        param: {
          url: 'https://example.com/pending-image.png',
        },
      },
    } as MessageToolChunk;

    expect(getImageUrlFromToolMessage(message)).toBe('https://example.com/pending-image.png');
  });

  it('reads the image url from update message blocks', () => {
    const message = {
      type: 'view_image_url',
      detail: {
        result: {
          update: {
            messages: [
              {
                content: [
                  {
                    type: 'text',
                    text: 'Viewing image from URL',
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: 'https://example.com/block-image.png',
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    } as MessageToolChunk;

    expect(getImageUrlFromToolMessage(message)).toBe('https://example.com/block-image.png');
  });

  it('reads the image url from JSON tool content', () => {
    const message = {
      type: 'image_parser',
      detail: {},
    } as MessageToolChunk;

    expect(getImageUrlFromToolMessage(message, '{"image_url":"https://example.com/content-image.png"}')).toBe(
      'https://example.com/content-image.png',
    );
  });

  it('marks browser, image generation, and view_image_url as renderable while pending', () => {
    expect(shouldRenderToolDetailWhilePending({ type: 'browser-use' } as MessageToolChunk)).toBe(true);
    expect(shouldRenderToolDetailWhilePending({ type: 'image_generation' } as MessageToolChunk)).toBe(true);
    expect(shouldRenderToolDetailWhilePending({ type: 'view_image_url' } as MessageToolChunk)).toBe(true);
    expect(shouldRenderToolDetailWhilePending({ type: 'run_command' } as MessageToolChunk)).toBe(false);
  });
});
