import React from 'react';
import { Badge, Button, Popover, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import AddFileIcon from '@/assets/svg/labels/add-files.svg?react';
import KnowledgeBaseIcon from '@/assets/svg/labels/select-knowledge-base.svg?react';
import { useTranslation } from '@/hooks/useTranslation';

interface SenderQuickActionsProps {
  isPPTAssistant: boolean;
  fileUploadDisabled?: boolean;
  showSenderActions: boolean;
  hasKnowledgeBases: boolean;
  sessionActive: boolean;
  knowledgeReadonly?: boolean;
  senderFilesLength: number;
  maxFileLength: number;
  headerOpen: boolean;
  quickActionOpen: boolean;
  setQuickActionOpen: (open: boolean) => void;
  selectedKnowledgeBaseCount: number;
  openKnowledgeBaseModal: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const SenderQuickActions: React.FC<SenderQuickActionsProps> = ({
  isPPTAssistant,
  fileUploadDisabled,
  showSenderActions,
  hasKnowledgeBases,
  sessionActive,
  knowledgeReadonly,
  senderFilesLength,
  maxFileLength,
  headerOpen,
  quickActionOpen,
  setQuickActionOpen,
  selectedKnowledgeBaseCount,
  openKnowledgeBaseModal,
  fileInputRef,
}) => {
  const { t } = useTranslation();
  if (isPPTAssistant) {
    return (
      <div className="flex items-center gap-2">
        <Tooltip
          title={
            <div className="flex flex-col text-[12px] leading-[16px] whitespace-nowrap">
              <span>{t('sender.quick_actions.upload_ppt_template_tooltip_template')}</span>
              <span>{t('sender.quick_actions.upload_ppt_template_tooltip_copy')}</span>
            </div>
          }
          overlayClassName="agentx-ppt-tooltip"
          overlayStyle={{ maxWidth: 'none' }}
          placement="topLeft"
          arrow={{ pointAtCenter: true }}
        >
          <Button
            type="text"
            shape="round"
            className="agentx-ppt-btn"
            icon={<PlusOutlined />}
            disabled={!sessionActive || senderFilesLength >= maxFileLength}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('sender.quick_actions.upload_ppt_template')}
          </Button>
        </Tooltip>
        {hasKnowledgeBases && selectedKnowledgeBaseCount === 0 && (
          <Tooltip title={t('sender.quick_actions.select_knowledge_base')}>
            <Button
              type="text"
              shape="round"
              className="agentx-ppt-btn agentx-ppt-btn--icon-only"
              icon={<KnowledgeBaseIcon />}
              disabled={!sessionActive || knowledgeReadonly}
              onClick={openKnowledgeBaseModal}
            />
          </Tooltip>
        )}
      </div>
    );
  }

  const showPlusIcon = !fileUploadDisabled || (showSenderActions && hasKnowledgeBases);
  if (!showPlusIcon) return null;

  const showUpload = !fileUploadDisabled;
  const showKnowledgeBase = showSenderActions && hasKnowledgeBases;

  return (
    <Popover
      open={quickActionOpen}
      onOpenChange={setQuickActionOpen}
      trigger="click"
      placement="topLeft"
      arrow={false}
      overlayClassName="agentx-quick-actions-popover"
      content={
        <div className="agentx-quick-actions">
          {showUpload && (
            <Tooltip
              title={
                <div className="flex flex-col text-[12px] leading-[16px] whitespace-nowrap">
                  <span>{t('sender.quick_actions.upload_tooltip_line1')}</span>
                  <span>{t('sender.quick_actions.upload_tooltip_line2')}</span>
                </div>
              }
              overlayClassName="agentx-ppt-tooltip"
              overlayStyle={{ maxWidth: 'none' }}
              placement="top"
              arrow={{ pointAtCenter: true }}
            >
              <span style={{ display: 'block' }}>
                <button
                  type="button"
                  className="agentx-quick-actions-item"
                  disabled={!sessionActive || senderFilesLength >= maxFileLength}
                  onClick={() => {
                    setQuickActionOpen(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <span className="agentx-quick-actions-icon">
                    <AddFileIcon />
                  </span>
                  <span>{t('sender.quick_actions.add_files')}</span>
                </button>
              </span>
            </Tooltip>
          )}
          {showUpload && showKnowledgeBase && <div className="agentx-quick-actions-divider" />}
          {showKnowledgeBase && (
            <button
              type="button"
              className="agentx-quick-actions-item"
              disabled={!sessionActive || knowledgeReadonly}
              onClick={() => {
                setQuickActionOpen(false);
                openKnowledgeBaseModal();
              }}
            >
              <span className="agentx-quick-actions-icon">
                <KnowledgeBaseIcon />
              </span>
              <span>{t('sender.quick_actions.select_knowledge_base')}</span>
            </button>
          )}
        </div>
      }
    >
      <Badge dot={senderFilesLength > 0 && !headerOpen}>
        <Button
          type="text"
          shape="circle"
          icon={<PlusOutlined />}
          disabled={!sessionActive}
          style={{ fontSize: '18px', width: '36px', height: '36px' }}
        />
      </Badge>
    </Popover>
  );
};

export default SenderQuickActions;
