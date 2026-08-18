import React, { useEffect, useMemo, useState } from 'react';
import { Button, ConfigProvider, Input, Modal } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import { useTranslation } from '@/hooks/useTranslation';
import type { FeedbackType } from '@/types';
import { getReasonCodes, getReasonI18nKey } from '../reasons';

interface FeedbackModalProps {
  open: boolean;
  feedbackType: FeedbackType;
  initialReasonCodes?: string[];
  initialComment?: string | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: { reason_codes: string[]; comment: string | null }) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  open,
  feedbackType,
  initialReasonCodes = [],
  initialComment,
  confirmLoading,
  onCancel,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const reasonCodes = getReasonCodes(feedbackType);
  const [selectedCodes, setSelectedCodes] = useState<string[]>(initialReasonCodes);
  const [comment, setComment] = useState(initialComment ?? '');

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedCodes(initialReasonCodes);
    setComment(initialComment ?? '');
    // Reset only when the modal opens or the like/dislike type changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, feedbackType]);

  const hasOther = selectedCodes.includes('other');
  const trimmedComment = comment.trim();
  const canSubmit = useMemo(() => {
    if (hasOther) {
      return trimmedComment.length > 0;
    }
    return selectedCodes.length > 0 || trimmedComment.length > 0;
  }, [hasOther, selectedCodes.length, trimmedComment.length]);

  const toggleCode = (code: string) => {
    setSelectedCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  };

  const handleOk = () => {
    if (!canSubmit) {
      return;
    }
    onSubmit({
      reason_codes: selectedCodes,
      comment: trimmedComment ? trimmedComment : null,
    });
  };

  return (
    <ConfigProvider
      theme={{
        components: {
          Modal: {
            borderRadiusLG: 20,
            contentBg: '#ffffff',
          },
        },
      }}
    >
      <Modal
        title={t('feedback.submit')}
        open={open}
        onCancel={onCancel}
        centered
        width={480}
        destroyOnHidden
        closeIcon={<CloseOutlined className="flex size-5 items-center justify-center text-sm text-black" />}
        styles={{
          container: {
            padding: 0,
            boxShadow: '0px 4px 18px rgba(0, 0, 0, 0.2)',
          },
          header: {
            margin: '0 20px',
            marginBottom: 0,
            paddingTop: 16,
            paddingBottom: 16,
            fontSize: 16,
            fontWeight: 500,
            lineHeight: '20px',
            color: '#000',
            borderBottom: '1px solid #EAEAEA',
          },
          body: {
            padding: '20px 20px 0',
          },
          footer: {
            margin: '0 20px',
            paddingTop: 12,
            paddingBottom: 20,
            borderTop: 'none',
          },
        }}
        footer={
          <div className="flex justify-end gap-3">
            <Button onClick={onCancel} className="min-w-[60px]">
              {t('button.cancel')}
            </Button>
            <Button
              type="primary"
              disabled={!canSubmit}
              loading={confirmLoading}
              className="min-w-[60px]"
              onClick={handleOk}
            >
              {t('button.ok')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-3">
            {reasonCodes.map((code) => {
              const selected = selectedCodes.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  className={classNames(
                    'box-border flex h-9 items-center justify-center rounded-md border px-3 text-sm font-normal leading-5 cursor-pointer',
                    selected ? 'border-black bg-black text-white' : 'border-[#EAEAEA] bg-white text-black',
                  )}
                  onClick={() => toggleCode(code)}
                >
                  {t(getReasonI18nKey(code))}
                </button>
              );
            })}
          </div>
          <Input.TextArea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t('feedback.placeholder')}
            className="!h-[100px] !min-h-[100px] !resize-none rounded-lg px-3 py-2 text-sm leading-5 placeholder:!text-[#ccc]"
          />
        </div>
      </Modal>
    </ConfigProvider>
  );
};

export default FeedbackModal;
