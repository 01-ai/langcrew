import React, { useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Multiple-choice question component.
 *
 * Interaction rules:
 * - Clicking an option toggles it; a checkbox indicates its current state.
 * - An empty selection can be submitted; the parent decides how to display it.
 * - After submission, selected options remain active, unselected options are dimmed,
 *   and the submit button is disabled.
 * - When interactive=false, all options and buttons are disabled and visually dimmed.
 */
interface MultiSelectQuestionProps {
  options: string[];
  /** Whether the component is interactive. All actions are disabled when false. */
  interactive: boolean;
  prompt?: React.ReactNode;
  /** Previously submitted options restored after a page refresh. */
  initialValues?: string[];
  /** Called with all options selected by the user. */
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

/** Keep selected rows active and dim unselected rows after submission or while disabled. */
const getOptionClass = ({ selected = false, dimmed = false }: { selected?: boolean; dimmed?: boolean }) =>
  classNames(
    'flex w-full items-center gap-3 rounded-lg border-none bg-white p-2 text-left text-[14px] leading-5 transition-colors',
    {
      'cursor-pointer hover:bg-[#F6F6F8]': !dimmed && !selected,
      'cursor-pointer': selected && !dimmed,
      'cursor-not-allowed opacity-40': dimmed,
    },
  );

/** Checkbox icon: an empty outline when unchecked and a white check on black when checked. */
const Checkbox: React.FC<{ checked: boolean }> = ({ checked }) => (
  <div
    className={classNames(
      'flex-shrink-0 size-5 rounded flex items-center justify-center transition-colors',
      checked ? 'bg-black' : 'border border-[#E9E9E9]',
    )}
  >
    {checked && (
      <svg viewBox="0 0 12 10" className="w-3 h-2.5" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1,5 4,8 11,1" />
      </svg>
    )}
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
  // Restore initialValues as the selected state after a page refresh.
  const [selectedOptions, setSelectedOptions] = useState<string[]>(initialValues ?? []);
  // submitted keeps selected options active and dims the rest after submission.
  // initialValues indicates that the user has already submitted an answer.
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
            // Dim unselected options after submission or while disabled.
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
