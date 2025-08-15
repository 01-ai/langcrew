import { E2BFile, FileItem, MessageChunk } from '@/types';

// 工具函数
export const getVisibleAttachments = (attachments: E2BFile[] | FileItem[]) =>
  attachments?.filter((attachment) => (attachment as E2BFile).show_user !== 0);

export const hasAttachments = (message: MessageChunk) =>
  message?.detail?.attachments && message.detail.attachments.length > 0;
