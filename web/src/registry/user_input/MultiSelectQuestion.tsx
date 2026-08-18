import React, { useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from '@/hooks/useTranslation';
import CheckIcon from '@/assets/svg/user-input/check.svg?react';

/**
 * Multi-select question.
 *
 * Interaction:
 * - Click to toggle; a checkbox shows the current state
 * - Submit with nothing selected is allowed; parent decides how to show empty
 * - After submit: selected stays dark, others grey out, submit disabled
 * - When interactive=false, options and buttons are disabled (semi-transparent)
 */
interface MultiSelectQuestionProps {
  options: string[];
  /** When false, all interactions are disabled */
  interactive: boolean;
  prompt?: React.ReactNode;
  /** Restore submitted options after refresh */
  initialValues?: string[];
  /** Submit callback; argument is the selected options */
  onSubmit: (values: string[]) => void;
}

const cardClass =
  'flex w-[400px] max-w-full flex-col items-start rounded-2xl border border-[#E9E9E9] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]';

const submitButtonClass =
  'relative flex h-10 w-full items-center justify-center overflow-hidden rounded-md border border-black bg-gradient-to-b from-[#333] to-[#222] px-4 text-[14px] font-medium leading-5 text-white shadow-[inset_0_-1.5px_1px_#000,inset_0_1.5px_1px_rgba(255,255,255,0.3)] transition-opacity';

const getSubmitClass = (disabled: boolean) =>
  classNames(submitButtonClass, {
    'cursor-pointer': !disabled,
    'cursor-not-allowed opacity-40': disabled,
  });

/** Option row: selected stays normal; others grey out after submit/disable */
const getOptionClass = ({ selected = false, dimmed = false }: { selected?: boolean; dimmed?: boolean }) =>
  classNames(
    'flex w-full items-center gap-3 rounded-lg border-none bg-white p-2 text-left text-[14px] leading-5 transition-colors',
    {
      'cursor-pointer hover:bg-[#F6F6F8]': !dimmed && !selected,
      'cursor-pointer': selected && !dimmed,
      'cursor-not-allowed opacity-40': dimmed,
    },
  );

/** Checkbox icon: empty box, or black with a white check when selected */
const Checkbox: React.FC<{ checked: boolean }> = ({ checked }) => (
  <div
    className={classNames(
      'flex-shrink-0 size-5 rounded flex items-center justify-center transition-colors',
      checked ? 'bg-black' : 'border border-[#E9E9E9]',
    )}
  >
    {checked && <CheckIcon className="w-3 h-2.5" />}
  </div>
);

const MultiSelectQuestion: React.FC<MultiSelectQuestionProps> = ({
  options,
  interactive,
  prompt,
  initialValues,
  onSubmit,
}) => {
  const { t } = useTranslation();
  // initialValues (after refresh): start already selected
  const [selectedOptions, setSelectedOptions] = useState<string[]>(initialValues ?? []);
  // submitted keeps the chosen option highlighted and greys out the rest;
  // initialValues means already submitted
  const [submitted, setSubmitted] = useState(!!initialValues?.length);

  const toggle = (option: string) => {
    if (!interactive || submitted) return;
    setSelectedOptions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
    );
  };

  const handleSubmit = () => {
    if (!interactive || submitted) return;
    setSubmitted(true);
    onSubmit(selectedOptions);
  };

  const submitDisabled = !interactive || submitted;

  return (
    <div className={classNames(cardClass, 'gap-6')}>
      <div className="flex w-full flex-col gap-4">
        {prompt}
        <div className="flex w-full flex-col gap-2">
          {options.map((option) => {
            const selected = selectedOptions.includes(option);
            // After submit/disable, unselected options grey out; selected stays normal
            const dimmed = (!interactive || submitted) && !selected;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                disabled={!interactive || submitted}
                onClick={() => toggle(option)}
                className={getOptionClass({ selected, dimmed })}
              >
                <Checkbox checked={selected} />
                {option}
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        disabled={submitDisabled}
        onClick={handleSubmit}
        className={getSubmitClass(submitDisabled)}
      >
        {t('form.submit.button')}
      </button>
    </div>
  );
};

export default MultiSelectQuestion;
