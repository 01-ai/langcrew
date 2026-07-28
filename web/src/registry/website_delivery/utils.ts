import type { MessageToolChunk } from '@/types';
import { isJsonString } from '@/utils/json';

export const WEBSITE_DELIVERY_TYPES = ['website_delivery'];
export const SERVICE_DEPLOY_TYPE = 'service_deploy';

export const isWebsiteType = (type?: string) => {
  return !!type && WEBSITE_DELIVERY_TYPES.includes(type);
};

export const isWebsiteDeliveryMessage = (message?: Pick<MessageToolChunk, 'type' | 'detail'>) => {
  if (!message) return false;
  if (isWebsiteType(message.type)) return true;
  return message.type === SERVICE_DEPLOY_TYPE && message.detail?.param?.mode === 'deliver';
};

export const isServiceDeployPreviewMessage = (message?: Pick<MessageToolChunk, 'type' | 'detail'>) => {
  return message?.type === SERVICE_DEPLOY_TYPE && message.detail?.param?.mode === 'deploy';
};

export const isWebsitePreviewMessage = (message?: Pick<MessageToolChunk, 'type' | 'detail'>) => {
  return isWebsiteDeliveryMessage(message) || isServiceDeployPreviewMessage(message);
};

export const isCompletedWebsiteDeliveryMessage = (message?: Pick<MessageToolChunk, 'type' | 'detail'>) => {
  const status = message?.detail?.status;
  return isWebsiteDeliveryMessage(message) && !!status && status !== 'running' && status !== 'pending';
};

export const findCompletedWebsiteDelivery = (messages: any[]): MessageToolChunk | undefined => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (isCompletedWebsiteDeliveryMessage(msg)) {
      return msg as MessageToolChunk;
    }
    if (msg?.type === 'plan') {
      for (let j = (msg.children || []).length - 1; j >= 0; j--) {
        const step = msg.children[j];
        const found = findCompletedWebsiteDelivery(step.children || []);
        if (found) return found;
      }
    }
  }
  return undefined;
};

export type WebsitePreviewContent = {
  success?: boolean;
  preview_url?: string;
  domain_url?: string;
  url?: string;
  sandbox_url?: string;
  website_name?: string;
  service_name?: string;
  message?: string;
  zip?: {
    filename?: string;
    url?: string;
  };
  [key: string]: any;
};

export const parseWebsitePreviewContent = (content: unknown): WebsitePreviewContent | null => {
  if (!content) return null;
  if (typeof content === 'object') return content as WebsitePreviewContent;
  if (typeof content !== 'string' || !isJsonString(content)) return null;

  try {
    return JSON.parse(content) as WebsitePreviewContent;
  } catch {
    return null;
  }
};

export const normalizeWebsitePreviewUrl = (url?: string) => {
  const trimmed = url?.trim();
  if (!trimmed) return '';
  if (/^(https?:|blob:|data:|\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const getWebsitePreviewUrl = (message?: MessageToolChunk, content?: unknown) => {
  const data = parseWebsitePreviewContent(content);
  const result = message?.detail?.result as any;
  const artifact = result?.artifact;
  const param = message?.detail?.param as any;
  const rawUrl =
    data?.preview_url ||
    data?.domain_url ||
    data?.url ||
    data?.sandbox_url ||
    artifact?.preview_url ||
    artifact?.domain_url ||
    artifact?.url ||
    artifact?.sandbox_url ||
    result?.preview_url ||
    result?.domain_url ||
    result?.url ||
    result?.sandbox_url ||
    param?.domain_url;

  if (rawUrl) return normalizeWebsitePreviewUrl(rawUrl);
  if (typeof content === 'string' && /^(https?:\/\/|[a-z0-9.-]+\.[a-z]{2,})/i.test(content.trim())) {
    return normalizeWebsitePreviewUrl(content);
  }
  return '';
};
