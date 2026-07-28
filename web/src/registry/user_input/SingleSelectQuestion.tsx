import React, { useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from '@/hooks/useTranslation';
import CustomInputIcon from './assets/custom.svg?react';
import SendIcon from './assets/send.svg?react';

/**
 * Single-choice question with preset options and custom text input.
 *
 * Interaction rules:
 * - Clicking a preset option submits immediately, highlights it, and dims the others.
 * - Typing custom text does not dim preset options.
 * - Pressing Enter or clicking send submits custom text and dims the preset options.
 * - When interactive=false, every option and input is disabled and visually dimmed.
 */
interface SingleSelectQuestionProps {
  options: string[];
  /** Whether the component is interactive. All actions are disabled when false. */
  interactive: boolean;
  prompt?: React.ReactNode;
  /** Previously submitted preset or custom value restored after a page refresh. */
  initialValue?: string;
  /** Called with the final value selected or entered by the user. */
  onSubmit: (value: string) => void;
}

const cardClass =
  'flex w-[400px] max-w-full flex-col items-start rounded-2xl border border-[#E9E9E9] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]';

// Shared classes for every option state.
const optionClass =
  'flex w-full items-center whitespace-normal break-words rounded-lg border-none bg-white text-left text-[14px] leading-5 transition-colors';

/**
 * dimmed is true for unselected items after a value has been chosen, which focuses
 * attention on the selected result.
 */
const getOptionClass = ({ selected = false, dimmed = false }: { selected?: boolean; dimmed?: boolean }) =>
  classNames(optionClass, {
    'cursor-pointer hover:bg-[#F6F6F8]': !selected && !dimmed,
    'cursor-not-allowed opacity-40': dimmed,
    'cursor-default': selected,
  });

// Shared style for numbered badges and icon containers.
const badgeClass =
  'flex-shrink-0 size-8 bg-neutral-50 rounded-lg outline-1 outline-offset-[-1px] outline-gray-200 inline-flex justify-center items-center overflow-hidden text-black text-sm font-normal leading-5';

const SingleSelectQuestion: React.FC<SingleSelectQuestionProps> = ({
  options,
  interactive,
  prompt,
  initialValue,
  onSubmit,
}) => {
  const { t } = useTranslation();

  // Set selectedValue only after the user submits a preset or custom value. Keep it
  // undefined while typing so preset options are not dimmed prematurely. initialValue
  // restores a previous submission after a page refresh.
  const [selectedValue, setSelectedValue] = useState<string | undefined>(initialValue);
  // Restore initialValue in the text field when it is not one of the preset options.
  const [customValue, setCustomValue] = useState(initialValue && !options.includes(initialValue) ? initialValue : '');

  const handleOptionClick = (option: string) => {
    if (!interactive) return;
    setSelectedValue(option);
    onSubmit(option);
  };

  const handleCustomEnter = () => {
    if (!interactive || customValue.trim().length === 0) return;
    // Dim preset options after submitting custom text, matching preset-option behavior.
    setSelectedValue(customValue);
    onSubmit(customValue);
  };

  return (
    <div className={classNames(cardClass, 'gap-6')}>
      <div className="flex w-full flex-col gap-4">
        {prompt}
        <div className="flex w-full flex-col gap-2">
          {options.map((option, index) => {
            const selected = selectedValue === option;
            // Dim unselected options while disabled or after another value is selected.
            const dimmed = (!interactive || !!selectedValue) && !selected;
            return (
              <button
                key={option}
                type="button"
                aria-label={option}
                aria-pressed={selected}
                disabled={!interactive}
                onClick={() => handleOptionClick(option)}
                className={classNames(getOptionClass({ selected, dimmed }), 'p-2')}
              >
                <div className="flex items-center gap-3">
                  <div className={badgeClass}>{index + 1}</div>
                  {option}
                </div>
              </button>
            );
          })}

          {/* Dim custom input after a preset selection, but keep a submitted custom value active. */}
          <div
            className={classNames(
              'flex items-center gap-3 p-2 transition-opacity rounded-lg focus-within:bg-[#F6F6F8]',
              {
                'opacity-40 cursor-not-allowed':
                  (!!selectedValue && options.includes(selectedValue)) ||
                  (!interactive && !(selectedValue && selectedValue === customValue)),
              },
            )}
          >
            <div className={badgeClass}>
              <CustomInputIcon />
            </div>
            <input
              value={customValue}
              disabled={!interactive}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomEnter();
              }}
              placeholder={t('user_input.custom.placeholder')}
              className="h-8 w-full text-[14px] leading-5 text-black outline-none placeholder:text-[#CCC] border-none bg-transparent hover:bg-transparent active:bg-transparent focus:bg-transparent"
            />
            {/* The send button and Enter key submit the same value. */}
            {interactive && customValue.trim().length > 0 && (
              <button
                type="button"
                aria-label={t('form.submit.button')}
                onClick={handleCustomEnter}
                className={classNames(badgeClass, 'cursor-pointer')}
              >
                <SendIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};;

export default SingleSelectQuestion;
