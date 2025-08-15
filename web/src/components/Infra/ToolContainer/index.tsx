import React, { PropsWithChildren } from 'react';

interface ToolContainerProps extends PropsWithChildren {
  icon?: React.ReactNode;
  action?: string;
  param?: string;
}

const ToolContainer: React.FC<ToolContainerProps> = ({ icon, action, param }) => {
  return (
    <div className="flex items-center gap-2 w-full overflow-hidden">
      {icon && <div className="text-[16px]">{icon}</div>}
      <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap flex gap-2">
        <div className="color-black max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap">{action}</div>
        {param && (
          <div className="text-[#666] flex-1 overflow-hidden overflow-ellipsis whitespace-nowrap" title={param}>
            {param}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolContainer;
