import { useTranslation } from '@/hooks/useTranslation';
import EnterIcon from '@/assets/svg/startscreen/enter.svg?react';
import classNames from 'classnames';
import React from 'react';

export interface StartScreenProps {
  greeting?: string | React.ReactNode;
  prompts?: string[];
  onPromptClick?: (prompt: string) => void;
  disabled?: boolean;
}

const StartScreen: React.FC<StartScreenProps> = (props) => {
  const { t } = useTranslation();
  const greeting = props.greeting !== undefined ? props.greeting : t('agent.default.greeting');
  const prompts = props.prompts;
  const onPromptClick = props.onPromptClick;
  const disabled = props.disabled !== undefined ? props.disabled : false;

  const handleClick = (prompt: string) => {
    if (disabled) return;
    onPromptClick?.(prompt);
  };

  return (
    <div className={classNames('w-full h-full flex flex-col px-2 items-center justify-center gap-5')}>
      {typeof greeting === 'string' ? (
        <div className="text-center text-black text-xl font-medium leading-6">{greeting}</div>
      ) : (
        greeting
      )}
      {prompts?.length > 0 && (
        <div className="w-full flex flex-col gap-3">
          {prompts?.map((prompt) => (
            <div
              key={prompt}
              className={classNames(
                'self-stretch px-4 py-3 bg-stone-50 rounded-3xl outline outline-1 outline-offset-[-1px] outline-zinc-100 inline-flex items-center',
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100',
              )}
              onClick={() => handleClick(prompt)}
            >
              <div className="flex-1 justify-start text-Light-CT1 text-sm font-normal leading-5">{prompt}</div>
              <div className="w-5 text-center justify-start text-stone-500 text-sm font-normal leading-5">
                <EnterIcon />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StartScreen;
