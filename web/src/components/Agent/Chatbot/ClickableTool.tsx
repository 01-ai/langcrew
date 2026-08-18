import React, { PropsWithChildren } from 'react';

interface ClickableToolProps {
  onClick: () => void;
  active?: boolean;
  className?: string;
}

const ClickableTool: React.FC<PropsWithChildren<ClickableToolProps>> = ({ children, onClick, active, className }) => {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-[16px] border flex items-center gap-[10px] px-3 py-2 text-[14px] leading-4 border-[#eaeaea] bg-[#f6f6f8] w-fit max-w-full relative hover:bg-[#efefef] transition-colors ${
        active ? 'active' : ''
      } ${className || ''}`}
    >
      {children}
    </div>
  );
};

export default ClickableTool;
