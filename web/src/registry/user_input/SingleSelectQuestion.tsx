import React, { useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from '@/hooks/useTranslation';
import CustomInputIcon from './assets/custom.svg?react';
import SendIcon from './assets/send.svg?react';

/**
 * Single-select: preset options or custom input.
 *
 * Interaction:
 * - Clicking a preset submits immediately; it highlights, others grey out
 * - Presets stay enabled while typing in the custom input
 * - Custom input Enter/send submits; presets all grey out
 * - When interactive=false, options and inputs are disabled (semi-transparent)
 */
interface SingleSelectQuestionProps {
  options: string[];
  /** When false, all interactions are disabled */
  interactive: boolean;
  prompt?: React.ReactNode;
  /** Restore submitted option or custom input after refresh */
  initialValue?: string;
  /** Submit callback; argument is the chosen or typed value */
  onSubmit: (value: string) => void;
}

const cardClass =
  'flex w-[400px] max-w-full flex-col items-start rounded-2xl border border-[#E9E9E9] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]';

// Shared option classes (border-none bg-white) lifted to the base class
const optionClass =
  'flex w-full items-center whitespace-normal break-words rounded-lg border-none bg-white text-left text-[14px] leading-5 transition-colors';

/**
 * dimmed: grey out unselected items when a selection exists (and not disabled),
 * Direct attention to the selected result.
 */
const getOptionClass = ({ selected = false, dimmed = false }: { selected?: boolean; dimmed?: boolean }) =>
  classNames(optionClass, {
    'cursor-pointer hover:bg-[#F6F6F8]': !selected && !dimmed,
    'cursor-not-allowed opacity-40': dimmed,
    'cursor-default': selected,
  });

// Shared styles for numbered badges and icon wrappers
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

  // selectedValue is set only after the user picks an option or presses Enter;
  // Stay undefined while typing so presets do not grey out early.
  // initialValue (after refresh): start already selected.
  const [selectedValue, setSelectedValue] = useState<string | undefined>(initialValue);
  // If initialValue is not a preset, treat it as custom input
  const [customValue, setCustomValue] = useState(initialValue && !options.includes(initialValue) ? initialValue : '');

  const handleOptionClick = (option: string) => {
    if (!interactive) return;
    setSelectedValue(option);
    onSubmit(option);
  };

  const handleCustomEnter = () => {
    if (!interactive || customValue.trim().length === 0) return;
    // After submit, set selectedValue so presets grey out like a click
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
            // Grey out when disabled or another value is selected; the selected item stays bright
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

          {/* Custom input row: greys out when a preset is selected;
              stay highlighted when the custom value itself is selected (selectedValue === customValue) */}
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
            {/* Send button when there is content; same as Enter */}
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
