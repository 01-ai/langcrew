import React from 'react';
import { CloseOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import type { MessageMetadata, MessageReferenceMetadata, ReferenceCardMetadata } from '@/types';
import type { MetadataRenderVariant, RenderMessageMetadata } from '@/types/agentx';
import ReferenceIcon from '@/assets/svg/sender/reference.svg?react';
import { useTranslation } from '@/hooks/useTranslation';

interface MessageMetadataRendererProps {
  metadata?: MessageMetadata;
  variant?: MetadataRenderVariant;
  onReferenceRemove?: () => void;
  renderMessageMetadata?: RenderMessageMetadata;
}

interface ReferenceRendererProps {
  reference?: MessageReferenceMetadata;
  variant?: MetadataRenderVariant;
  onRemove?: () => void;
}

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeReference = (reference?: MessageReferenceMetadata): ReferenceCardMetadata[] => {
  if (!reference) return [];

  const references = Array.isArray(reference) ? reference : [reference];
  return references.filter(isRecord) as ReferenceCardMetadata[];
};

const getReferenceTitle = (reference: ReferenceCardMetadata, fallbackTitle: string) => {
  return reference.title || reference.name || reference.content || reference.id || fallbackTitle;
};

const getReferenceSubtitle = (reference: ReferenceCardMetadata) => {
  return reference.subtitle || reference.description || reference.type;
};

export const ReferenceRenderer: React.FC<ReferenceRendererProps> = ({ reference, variant = 'message', onRemove }) => {
  const { t } = useTranslation();
  const references = normalizeReference(reference);

  if (references.length === 0) {
    return null;
  }

  return (
    <div className={classNames('flex flex-col gap-2 max-w-full', variant === 'message' ? 'items-end mb-2' : 'w-full')}>
      {references.map((item, index) => {
        const title = getReferenceTitle(item, t('reference.default_title'));
        const subtitle = getReferenceSubtitle(item);
        const cardKey = item.id || `${item.type || 'reference'}-${index}`;

        return (
          <div
            key={cardKey}
            className={classNames(
              'relative flex items-center gap-3 rounded-[16px] border border-[#EAEAEA] bg-white px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]',
              variant === 'draft' ? 'w-full' : 'w-[472px] max-w-full',
            )}
          >
            <div className="size-10 relative bg-zinc-100 rounded-lg overflow-hidden flex items-center justify-center">
              <ReferenceIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              {variant === 'draft' ? <div className="text-[14px] leading-[18px] text-[#999] mb-1">{t('reference.draft_label')}</div> : null}
              <div className="text-[16px] leading-[22px] font-medium text-black truncate">{title}</div>
              {subtitle ? <div className="mt-1 text-[14px] leading-[18px] text-[#999] truncate">{subtitle}</div> : null}
            </div>
            {variant === 'draft' && onRemove ? (
              <button
                type="button"
                className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center border-none bg-transparent p-0 text-[#999] hover:text-black cursor-pointer"
                aria-label={t('reference.remove')}
                onClick={onRemove}
              >
                <CloseOutlined style={{ fontSize: 14 }} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const MessageMetadataRenderer: React.FC<MessageMetadataRendererProps> = ({
  metadata,
  variant = 'message',
  onReferenceRemove,
  renderMessageMetadata,
}) => {
  if (!metadata) {
    return null;
  }

  const defaultRenderer = metadata.reference ? (
    <ReferenceRenderer reference={metadata.reference} variant={variant} onRemove={onReferenceRemove} />
  ) : null;

  if (renderMessageMetadata) {
    return (
      <>
        {renderMessageMetadata({
          metadata,
          variant,
          defaultRenderer,
          onReferenceRemove,
        })}
      </>
    );
  }

  return <>{defaultRenderer}</>;
};

export default MessageMetadataRenderer;
