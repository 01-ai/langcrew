import React, { useState, type CSSProperties } from 'react';
import { useAgentStoreApi } from '@/store';
import AllFilesModal from './MessageAttachments/AllFilesModal';
import FileIcon from '@/assets/svg/fileviewer/file-icon.svg?react';
import classNames from 'classnames';
import { Tooltip } from 'antd';
import { useTranslation } from '@/hooks/useTranslation';

export interface ChatFilesProps {
  className?: string;
  style?: CSSProperties;
}

/**
 * ChatFiles Component - Show the file list of the current session
 */
export function ChatFiles({ className, style }: ChatFilesProps) {
  const storeApi = useAgentStoreApi();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const sessionId = storeApi.getState().sessionInfo?.session_id || '';

  if (!sessionId) {
    return null;
  }

  return (
    <Tooltip title={t('attachment.view.all')}>
      <div
        className={classNames(
          'w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-gray-100 rounded-sm',
          className,
        )}
        style={style}
        onClick={() => setOpen(true)}
      >
        <FileIcon />
      </div>
      <AllFilesModal open={open} onClose={() => setOpen(false)} sessionId={sessionId} />
    </Tooltip>
  );
}

export default ChatFiles;
