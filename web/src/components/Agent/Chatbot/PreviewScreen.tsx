import React, { useState } from 'react';
import { Dropdown } from 'antd';
import { useTranslation, UseTranslationReturn } from '@/hooks/useTranslation';
import CaseArrowIcon from '@/assets/svg/preview/case-arrow.svg?react';
import classNames from 'classnames';

export interface PreviewScreenPrompt {
  text: string;
  icon?: React.ReactNode;
}

export interface PreviewScreenUseCases {
  title?: string;
  description?: string;
  url?: string;
}

export interface PreviewScreenProps {
  /**
   * Agent Icon URL
   */
  agentIcon?: string;
  /**
   * Agent Name
   */
  agentName: string;
  /**
   * Agent Creator
   */
  agentCreator?: string;
  /**
   * Agent Description
   */
  agentDescription: string;
  /**
   * Example question list
   */
  prompts?: Array<string | PreviewScreenPrompt>;
  /**
   * Use Case List
   */
  useCases?: PreviewScreenUseCases[];
  /**
   * Click on the exemplary echo
   */
  onPromptClick?: (prompt: string) => void;
  /**
   * Whether to disable interactives
   */
  disabled?: boolean;
}

const PreviewScreen: React.FC<PreviewScreenProps> = ({
  agentIcon,
  agentName,
  agentCreator,
  agentDescription,
  prompts = [],
  useCases = [],
  onPromptClick,
  disabled = false,
}) => {
  const [useCasesOpen, setUseCasesOpen] = useState(false);
  const { t }: UseTranslationReturn = useTranslation();

  const handlePromptClick = (prompt: string) => {
    if (disabled) return;
    onPromptClick?.(prompt);
  };

  const normalizePrompt = (prompt: string | PreviewScreenPrompt): PreviewScreenPrompt => {
    if (typeof prompt === 'string') {
      return { text: prompt };
    }
    return prompt;
  };

  const handleUseCaseClick = (useCase: PreviewScreenUseCases) => {
    if (disabled) return;
    if (useCase.url) {
      window.open(useCase.url, '_blank');
    }
    setUseCasesOpen(false);
  };

  const dropdownRender = () => (
    <div
      className="w-[220px] bg-white border border-[#eaeaea] rounded-[16px] shadow-[0px_8px_32px_0px_rgba(0,0,0,0.12)] p-1 flex flex-col gap-1 max-h-[300px] overflow-y-auto"
      style={{ fontFamily: 'PingFang SC, sans-serif' }}
    >
      {useCases.map((useCase, index) => (
        <div
          key={index}
          className={classNames(
            'p-2 rounded-[12px] transition-colors',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#f6f6f8]',
          )}
          onClick={() => handleUseCaseClick(useCase)}
        >
          <div className="flex flex-col gap-1">
            <p className="text-[14px] leading-[16px] font-semibold text-black">{useCase.title}</p>
            {useCase.description && (
              <p className="text-[12px] leading-[16px] text-[#999] overflow-hidden text-ellipsis line-clamp-2">
                {useCase.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3 px-6">
      <div className="flex flex-col gap-5 items-center w-full">
        <div className="flex flex-col gap-3 items-center">
          {agentIcon && (
            <div className="w-[72px] h-[72px] rounded-[18px] overflow-hidden flex items-center justify-center">
              <img src={agentIcon} alt={agentName} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex flex-col gap-3 items-center text-center w-full">
            <h1
              className="text-[28px] leading-[36px] font-semibold text-[#28263b] whitespace-pre-wrap max-w-[420px]"
              style={{ fontFamily: 'PingFang SC, sans-serif' }}
            >
              {agentName}
            </h1>

            {agentCreator && (
              <p
                className="text-[14px] leading-[20px] text-[#999] max-w-[360px]"
                style={{ fontFamily: 'PingFang SC, sans-serif' }}
              >
                {t('preview.creator')}：{agentCreator}
              </p>
            )}

            <p
              className="text-[14px] leading-[20px] text-[#666] whitespace-pre-wrap max-w-[400px]"
              style={{ fontFamily: 'PingFang SC, sans-serif' }}
            >
              {agentDescription}
            </p>
          </div>
        </div>

        {prompts.length > 0 && (
          <div className="flex flex-col gap-3 items-center w-full">
            {prompts.map((prompt, index) => {
              const normalizedPrompt = normalizePrompt(prompt);
              return (
                <div
                  key={index}
                  className={classNames(
                    'w-[400px] bg-[#f9f9f9] border border-[#f1f1f1] rounded-[24px] px-4 py-3 flex items-center gap-1 transition-colors',
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#f5f5f5]',
                  )}
                  onClick={() => handlePromptClick(normalizedPrompt.text)}
                >
                  <p
                    className="flex-1 text-[14px] leading-[20px] text-black whitespace-pre-wrap break-words"
                    style={{ fontFamily: 'PingFang SC, sans-serif' }}
                  >
                    {normalizedPrompt.text}
                  </p>
                  <span className="text-[#666] text-[20px] leading-[20px] w-5 text-center flex-shrink-0">→</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {useCases && useCases.length > 0 && (
        <div className="flex items-center justify-center">
          <Dropdown
            open={disabled ? false : useCasesOpen}
            onOpenChange={(open) => {
              if (!disabled) setUseCasesOpen(open);
            }}
            popupRender={dropdownRender}
            trigger={['click']}
            placement="bottom"
          >
            <div
              className={classNames(
                'pl-5 pr-3 py-2 rounded-lg outline outline-offset-[-1px] outline-[#D8D8D8] inline-flex justify-start items-center gap-1 transition-colors',
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#f5f5f5]',
              )}
            >
              <div className="text-black text-sm font-normal leading-5">{t('preview.view_use_cases')}</div>
              <div className="w-5 h-5 flex items-center justify-center">
                <CaseArrowIcon className={classNames({ 'rotate-180': useCasesOpen })} />
              </div>
            </div>
          </Dropdown>
        </div>
      )}
    </div>
  );
};

export default PreviewScreen;
