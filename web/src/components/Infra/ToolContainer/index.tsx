import React, { PropsWithChildren } from 'react';

interface ToolContainerProps extends PropsWithChildren {
  icon?: React.ReactNode;
  action?: string;
  param?: string;
}

const ToolContainer: React.FC<ToolContainerProps> = ({ icon, action, param }) => {
  return (
    <div className="flex items-center gap-[10px] w-full overflow-hidden">
      {icon && (
        <div className="flex items-center justify-center size-[16px] shrink-0 text-[16px]">
          {icon}
        </div>
      )}
      <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap flex gap-1">
        <div className="text-black max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-[14px] leading-[16px]">{action}</div>
        {param && (
          <div className="text-[#666] flex-1 overflow-hidden overflow-ellipsis whitespace-nowrap text-[14px] leading-[16px]" title={param}>
            {param}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolContainer;
