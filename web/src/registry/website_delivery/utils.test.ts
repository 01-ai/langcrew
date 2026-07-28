import { describe, expect, it } from 'vitest';
import {
  findCompletedWebsiteDelivery,
  getWebsitePreviewUrl,
  isServiceDeployPreviewMessage,
  isWebsiteDeliveryMessage,
  isWebsitePreviewMessage,
  SERVICE_DEPLOY_TYPE,
} from './utils';
import { TaskStatus, type MessageToolChunk } from '@/types';

const toolMessage = (message: Partial<MessageToolChunk> & Pick<MessageToolChunk, 'type'>): MessageToolChunk =>
  ({
    content: '',
    ...message,
  }) as MessageToolChunk;

describe('website delivery utils', () => {
  it('treats service_deploy deliver mode as website delivery', () => {
    const message = toolMessage({
      type: SERVICE_DEPLOY_TYPE,
      detail: {
        param: {
          mode: 'deliver',
        },
      },
    });

    expect(isWebsiteDeliveryMessage(message)).toBe(true);
  });

  it('does not treat service_deploy deploy mode as website delivery', () => {
    const message = toolMessage({
      type: SERVICE_DEPLOY_TYPE,
      detail: {
        param: {
          mode: 'deploy',
        },
      },
    });

    expect(isWebsiteDeliveryMessage(message)).toBe(false);
  });

  it('treats service_deploy deploy mode as a website preview', () => {
    const message = toolMessage({
      type: SERVICE_DEPLOY_TYPE,
      detail: {
        param: {
          mode: 'deploy',
        },
      },
    });

    expect(isServiceDeployPreviewMessage(message)).toBe(true);
    expect(isWebsitePreviewMessage(message)).toBe(true);
  });

  it('does not treat service_deploy with missing mode as website delivery', () => {
    const message = toolMessage({
      type: SERVICE_DEPLOY_TYPE,
      detail: {
        param: {},
      },
    });

    expect(isWebsiteDeliveryMessage(message)).toBe(false);
  });

  it('keeps legacy website_delivery messages as website delivery', () => {
    const message = toolMessage({
      type: 'website_delivery',
      detail: {},
    });

    expect(isWebsiteDeliveryMessage(message)).toBe(true);
  });

  it('finds completed deliver-mode service_deploy messages for the mini preview', () => {
    const deployMessage = toolMessage({
      type: SERVICE_DEPLOY_TYPE,
      detail: {
        status: TaskStatus.Success,
        param: {
          mode: 'deploy',
        },
      },
    });
    const deliverMessage = toolMessage({
      type: SERVICE_DEPLOY_TYPE,
      detail: {
        status: TaskStatus.Success,
        param: {
          mode: 'deliver',
        },
      },
    });

    expect(findCompletedWebsiteDelivery([deployMessage, deliverMessage])).toBe(deliverMessage);
  });

  it('ignores completed deploy-mode service_deploy messages for the mini preview', () => {
    const deployMessage = toolMessage({
      type: SERVICE_DEPLOY_TYPE,
      detail: {
        status: TaskStatus.Success,
        param: {
          mode: 'deploy',
        },
      },
    });

    expect(findCompletedWebsiteDelivery([deployMessage])).toBeUndefined();
  });

  it('finds nested completed delivery messages inside plan steps', () => {
    const deliverMessage = toolMessage({
      type: SERVICE_DEPLOY_TYPE,
      detail: {
        status: TaskStatus.Success,
        param: {
          mode: 'deliver',
        },
      },
    });

    expect(
      findCompletedWebsiteDelivery([
        {
          type: 'plan',
          children: [
            {
              children: [deliverMessage],
            },
          ],
        },
      ]),
    ).toBe(deliverMessage);
  });

  it('normalizes preview urls from deploy result content', () => {
    const message = toolMessage({
      type: SERVICE_DEPLOY_TYPE,
      detail: {
        param: {
          mode: 'deploy',
        },
      },
    });

    expect(getWebsitePreviewUrl(message, { domain_url: 'example.com' })).toBe('https://example.com');
    expect(getWebsitePreviewUrl(message, { preview_url: 'https://example.com/app' })).toBe(
      'https://example.com/app',
    );
  });
});
