import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { CheckOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useAgentStore } from '@/store';
import { TaskStatus } from '@/types';
import Loading from '@/components/Infra/Loading';

// extract constants
const ICON_STYLES = {
  success: { color: '#4AC90F' },
  default: { fontSize: '12px' },
} as const;

// extract default number circle component
const NumberCircle: React.FC<{ number: number }> = ({ number }) => (
  <div className="flex items-center justify-center flex-none w-5 h-5 rounded-full bg-[#999] text-white text-xs">
    {number}
  </div>
);

const TaskProgress: React.FC = () => {
  const { t } = useTranslation();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const { taskPlan } = useAgentStore();

  const totalSteps = useMemo(() => taskPlan?.length ?? 0, [taskPlan]);
  const currentIndex = useMemo(() => {
    const workingStepIndex = taskPlan?.findLastIndex((item) => item.status === TaskStatus.Running);
    if (workingStepIndex !== -1) {
      return workingStepIndex;
    }
    const completedStepIndex = taskPlan?.findLastIndex((item) => item.status === TaskStatus.Success);
    if (completedStepIndex !== -1) {
      return completedStepIndex;
    }
    return 0;
  }, [taskPlan]);

  // use useMemo to cache icon mapping, avoid re-creating every time
  const iconMap = useMemo(
    () => ({
      [TaskStatus.Success]: <CheckOutlined style={ICON_STYLES.success} />,
      [TaskStatus.Running]: <Loading />,
    }),
    [],
  );

  // optimized iconRender function
  const iconRender = (index: number) => {
    const task = taskPlan?.[index];
    const status = task?.status;

    // if the status matches, return the corresponding icon, otherwise return the default number circle
    return iconMap[status] || <NumberCircle number={index + 1} />;
  };

  return (
    <div className="h-[54px] relative z-50">
      <div
        className={`flex absolute bottom-0 left-0 right-0 border border-black/8 bg-[#fff] rounded-[16px] sm:rounded-[12px] gap-5 ${
          isExpanded
            ? 'flex-col p-5 shadow-[0px_0px_1px_0px_rgba(0,_0,_0,_0.05),_0px_8px_32px_0px_rgba(0,_0,_0,_0.04)]'
            : 'flex-row items-start justify-between py-4 px-5 clickable shadow-none'
        }`}
      >
        <div className="flex justify-between w-full">
          {isExpanded || !taskPlan?.length ? (
            <span className="text-[#34322d] font-bold">{t('workspace.task.progress')}</span>
          ) : (
            <div className="flex items-center gap-2.5 w-full pr-5">
              {iconRender(currentIndex)}
              <div className="text-sm line-clamp-1">{taskPlan?.at(currentIndex)?.title}</div>
            </div>
          )}
          {!!taskPlan?.length && (
            <div className="flex items-center gap-3">
              <button
                className="flex h-full cursor-pointer items-center justify-center gap-2 hover:opacity-80 flex-shrink-0 text-[#000]"
                onClick={() => setIsExpanded((pre) => !pre)}
              >
                <span className="text-xs hidden sm:flex">{`${currentIndex + 1} / ${totalSteps}`}</span>
                {isExpanded ? (
                  <DownOutlined style={{ fontSize: '12px' }} />
                ) : (
                  <UpOutlined style={{ fontSize: '12px' }} />
                )}
              </button>
            </div>
          )}
        </div>
        {isExpanded && (
          <>
            {taskPlan?.map((item, index) => (
              <div key={index} className="flex items-center gap-2.5 w-full">
                {iconRender(index)}
                <div className="text-sm truncate">{item.title}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default TaskProgress;
