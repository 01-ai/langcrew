import React, { PropsWithChildren } from 'react';

interface ClickableToolProps {
  onClick: () => void;
  active?: boolean;
}

const ClickableTool: React.FC<PropsWithChildren<ClickableToolProps>> = ({ children, onClick, active }) => {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-3xl border flex items-center gap-2 px-3 py-2 leading-4 border-[#e9e9e9] bg-[#f0f0f0] w-fit max-w-full relative hover:bg-[#e5e5e5] ${
        active ? 'active' : ''
      }`}
    >
      {children}
    </div>
  );
};

export default ClickableTool;
