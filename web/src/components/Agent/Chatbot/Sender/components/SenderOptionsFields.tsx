import React from 'react';
import { Select } from 'antd';
import type { SenderOptionConfig } from '@/types';

interface SenderOptionsFieldsProps {
  options: SenderOptionConfig[];
  values: Record<string, string>;
  disabled: boolean;
  onChange: (field: string, value: string) => void;
}

const SenderOptionsFields: React.FC<SenderOptionsFieldsProps> = ({ options, values, disabled, onChange }) => {
  // Render currently-supported option fields (select). Other field types can be added here later.
  if (!options.length) return null;

  return (
    <>
      {options.map((optionConfig) => (
        <div key={optionConfig.field} className="min-w-[220px] ml-2 flex items-center gap-2">
          <span className="text-[12px] text-[#666] whitespace-nowrap">{optionConfig.label}</span>
          <Select
            size="small"
            className="min-w-[140px] flex-1"
            disabled={disabled}
            value={values[optionConfig.field]}
            placeholder={optionConfig.placeholder || optionConfig.label}
            options={optionConfig.options}
            onChange={(value) => onChange(optionConfig.field, value)}
          />
        </div>
      ))}
    </>
  );
};

export default SenderOptionsFields;
