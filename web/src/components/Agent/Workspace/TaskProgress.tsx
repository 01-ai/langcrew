import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { useAgentStore } from '@/store';
import { TaskStatus } from '@/types';
import Loading from '@/components/Infra/Loading';
import { isMessageFinish } from '@/hooks/useChat/utils';
import TaskListIcon from '@/assets/svg/migrated/task-progress/task-list-icon.svg?react';
import MaximizeIcon from '@/assets/svg/migrated/task-progress/maximize-icon.svg?react';
import GreenCheckIcon from '@/assets/svg/migrated/task-progress/green-check-icon.svg?react';

// Constants
const ICON_STYLES = {
  success: { color: '#4AC90F', fontSize: '20px' },
  default: { fontSize: '20px' },
} as const;

// SVG Icons from Frame 1597880295.svg






// Default numbered circle
const NumberCircle: React.FC<{ number: number }> = ({ number }) => (
  <div className="flex items-center justify-center flex-none w-5 h-5 rounded-full bg-[#999] text-white text-xs">
    {number}
  </div>
);

// Keep icon boxes the same size so gaps stay visually stable
const TaskIconBox: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="w-5 h-5 flex items-center justify-center flex-none">{children}</div>
);

type CompactBehavior = 'toggleList' | 'openWorkspace';
type CompactExpandedStyle = 'overlay' | 'workspaceCard';

const TaskProgress: React.FC<{
  variant?: 'default' | 'compact' | 'inputTop';
  compactBehavior?: CompactBehavior;
  compactExpandedStyle?: CompactExpandedStyle;
}> = ({ variant = 'default', compactBehavior = 'toggleList', compactExpandedStyle = 'overlay' }) => {
  const { t } = useTranslation();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const { taskPlan, setWorkspaceVisible, setLastWorkspaceAction, pipelineMessages, disableWorkspaceRendering } = useAgentStore();

  const isFinish = useMemo(() => {
    const lastAiMessage = pipelineMessages.findLast((message) => message.role === 'assistant');
    if (!lastAiMessage) {
      return false;
    }
    return isMessageFinish(lastAiMessage);
  }, [pipelineMessages]);

  const totalSteps = useMemo(() => taskPlan?.length ?? 0, [taskPlan]);
  const currentIndex = useMemo(() => {
    if (isFinish) {
      return Math.max(0, totalSteps - 1);
    }
    const workingStepIndex = taskPlan?.findLastIndex((item) => item.status === TaskStatus.Running);
    if (workingStepIndex !== -1) {
      return workingStepIndex;
    }
    const completedStepIndex = taskPlan?.findLastIndex((item) => item.status === TaskStatus.Success);
    if (completedStepIndex !== -1) {
      return completedStepIndex;
    }
    return 0;
  }, [isFinish, taskPlan, totalSteps]);

  // Memoize the icon map
  const iconMap = useMemo<Partial<Record<TaskStatus, React.ReactNode>>>(
    () => ({
      [TaskStatus.Success]: <GreenCheckIcon />,
      [TaskStatus.Running]: <Loading />,
    }),
    [],
  );

  // Icon renderer
  const iconRender = (index: number) => {
    const task = taskPlan?.[index];
    const status = task?.status;

    if (isFinish) {
      return <GreenCheckIcon />;
    }

    // Use the status icon, otherwise the numbered circle
    return (status && iconMap[status]) || <NumberCircle number={index + 1} />;
  };

  if (!taskPlan?.length) {
    return null;
  }

  if (variant === 'inputTop') {
    const currentTitle = taskPlan?.[currentIndex]?.title;
    const onOpenWorkspace = () => {
      // Record the trigger source
      setLastWorkspaceAction('user');
      // Update state and notify listeners
      setWorkspaceVisible(true);
    };

    return (
      <div className="w-full h-[40px] bg-[#F3F3F3] rounded-t-[16px] px-[20px] flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center flex-none w-6 h-6">
            <TaskListIcon />
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="text-[16px] leading-[20px] font-medium text-black whitespace-nowrap">
              {t('workspace.task.current_progress')}
              {`${currentIndex + 1}/${totalSteps}`}
            </div>

            {currentTitle ? (
              <div className="flex items-center gap-2 min-w-0">
                <TaskIconBox>{iconRender(currentIndex)}</TaskIconBox>
                <div className="text-[14px] leading-[18px] text-[#999] truncate">{currentTitle}</div>
              </div>
            ) : null}
          </div>
        </div>

        {!disableWorkspaceRendering && (
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5 transition-colors flex-none"
            onClick={onOpenWorkspace}
            aria-label={t('workspace.open')}
          >
            <MaximizeIcon />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    // Workspace-bottom: expanded card should match the screenshot style
    if (isExpanded && compactExpandedStyle === 'workspaceCard') {
      return (
        <div className="rounded-[12px] border border-black/8 bg-white shadow-sm px-[15px] py-4">
          <div className="flex items-center justify-between">
            <div className="text-black font-bold">{t('workspace.task.progress')}</div>
            <button
              type="button"
              className="flex items-center gap-2 text-black hover:opacity-80"
              onClick={() => setIsExpanded(false)}
              aria-label={t('workspace.collapse_task_progress')}
            >
              <span>{`${currentIndex + 1} / ${totalSteps}`}</span>
              <DownOutlined style={{ fontSize: '12px' }} />
            </button>
          </div>

          {/* Auto height: let content decide height; spacing tuned to match design */}
          <div className="mt-4 flex flex-col gap-2">
            {taskPlan?.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <TaskIconBox>{iconRender(index)}</TaskIconBox>
                <div className="text-sm text-black truncate">{item.title}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#EAEAEA] bg-white px-[15px] h-[48px]">
          <div className="flex items-center gap-2 min-w-0">
            <TaskIconBox>{iconRender(currentIndex)}</TaskIconBox>
            <div className="text-sm text-black truncate font-normal">{taskPlan?.[currentIndex]?.title}</div>
          </div>
          <div className="flex items-center gap-1 flex-none text-black/60">
            <span className="text-sm font-normal">{`${currentIndex + 1}/${totalSteps}`}</span>
            <button
              type="button"
              className="flex h-4 w-4 items-center justify-center bg-transparent text-black/60 hover:text-black transition-colors p-0 border-none cursor-pointer"
              onClick={() => {
                if (compactBehavior === 'openWorkspace') {
                  setLastWorkspaceAction('user');
                  setWorkspaceVisible(true);
                  return;
                }
                setIsExpanded((prev) => !prev);
              }}
              aria-label={
                compactBehavior === 'openWorkspace'
                  ? t('workspace.open')
                  : isExpanded
                  ? t('workspace.collapse_task_progress')
                  : t('workspace.expand_task_progress')
              }
            >
              {compactBehavior === 'openWorkspace' ? (
                <UpOutlined style={{ fontSize: '12px' }} />
              ) : isExpanded ? (
                <DownOutlined style={{ fontSize: '12px' }} />
              ) : (
                <UpOutlined style={{ fontSize: '12px' }} />
              )}
            </button>
          </div>
        </div>

        {isExpanded && compactExpandedStyle === 'overlay' && (
          <div className="absolute left-0 right-0 bottom-[56px] z-20 rounded-[12px] border border-[#EAEAEA] bg-white shadow-[0px_8px_32px_0px_rgba(0,0,0,0.08)] px-[15px] py-3">
            <div className="flex flex-col gap-2">
              {taskPlan?.map((item, index) => (
                <div key={index} className="flex items-center gap-2 w-full">
                  <TaskIconBox>{iconRender(index)}</TaskIconBox>
                  <div className="text-sm truncate">{item.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

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
              <TaskIconBox>{iconRender(currentIndex)}</TaskIconBox>
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
                <TaskIconBox>{iconRender(index)}</TaskIconBox>
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
