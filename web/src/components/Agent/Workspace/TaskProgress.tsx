import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { useAgentStore } from '@/store';
import { TaskStatus } from '@/types';
import Loading from '@/components/Infra/Loading';
import { isMessageFinish } from '@/hooks/useChat/utils';

// Rip constant
const ICON_STYLES = {
  success: { color: '#4AC90F', fontSize: '20px' },
  default: { fontSize: '20px' },
} as const;

// SVG Icons from Frame 1597880295.svg
const TaskListIcon = () => (
  <svg width="21" height="17" viewBox="16 13 21 17" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M19.9453 27.6641C18.9349 27.6641 18.1484 27.3698 17.5859 26.7812C17.0234 26.1927 16.7422 25.3646 16.7422 24.2969V16.4453C16.7422 15.3776 17.0234 14.5495 17.5859 13.9609C18.1484 13.3672 18.9349 13.0703 19.9453 13.0703H31.875C32.9427 13.0703 33.7708 13.3672 34.3594 13.9609C34.9531 14.5495 35.25 15.3776 35.25 16.4453V22.9766L33.7109 21.4297V16.5234C33.7109 15.9193 33.5417 15.4505 33.2031 15.1172C32.8698 14.7786 32.401 14.6094 31.7969 14.6094H20.1953C19.5859 14.6094 19.1146 14.7786 18.7812 15.1172C18.4479 15.4505 18.2812 15.9193 18.2812 16.5234V24.2109C18.2812 24.8203 18.4479 25.2917 18.7812 25.625C19.1146 25.9583 19.5859 26.125 20.1953 26.125H30.0703L30.0469 27.3203C30.0469 27.3828 30.0469 27.4375 30.0469 27.4844C30.0521 27.5365 30.0599 27.5964 30.0703 27.6641H19.9453ZM20.4375 17.4531C20.2344 17.4531 20.0599 17.3802 19.9141 17.2344C19.7734 17.0885 19.7031 16.9193 19.7031 16.7266C19.7031 16.5286 19.7734 16.3568 19.9141 16.2109C20.0599 16.0651 20.2344 15.9922 20.4375 15.9922C20.6354 15.9922 20.8047 16.0651 20.9453 16.2109C21.0859 16.3568 21.1562 16.5286 21.1562 16.7266C21.1562 16.9193 21.0859 17.0885 20.9453 17.2344C20.8047 17.3802 20.6354 17.4531 20.4375 17.4531ZM22.7344 17.4531C22.5365 17.4531 22.3646 17.3802 22.2188 17.2344C22.0781 17.0885 22.0078 16.9193 22.0078 16.7266C22.0078 16.5286 22.0781 16.3568 22.2188 16.2109C22.3646 16.0651 22.5365 15.9922 22.7344 15.9922C22.9375 15.9922 23.1094 16.0651 23.25 16.2109C23.3906 16.3568 23.4609 16.5286 23.4609 16.7266C23.4609 16.9193 23.3906 17.0885 23.25 17.2344C23.1094 17.3802 22.9375 17.4531 22.7344 17.4531ZM25.0391 17.4531C24.8359 17.4531 24.6641 17.3802 24.5234 17.2344C24.3828 17.0885 24.3125 16.9193 24.3125 16.7266C24.3125 16.5286 24.3828 16.3568 24.5234 16.2109C24.6641 16.0651 24.8359 15.9922 25.0391 15.9922C25.2422 15.9922 25.4141 16.0651 25.5547 16.2109C25.6953 16.3568 25.7656 16.5286 25.7656 16.7266C25.7656 16.9193 25.6953 17.0885 25.5547 17.2344C25.4141 17.3802 25.2422 17.4531 25.0391 17.4531ZM34.9531 29.6641C34.7656 29.7422 34.5755 29.7422 34.3828 29.6641C34.1953 29.5911 34.0651 29.4609 33.9922 29.2734L32.8828 26.5156L31.7656 27.6484C31.6562 27.7682 31.526 27.8021 31.375 27.75C31.224 27.7031 31.151 27.5938 31.1562 27.4219L31.2344 21.2656C31.2344 21.1094 31.2995 21.0052 31.4297 20.9531C31.5651 20.901 31.6875 20.9323 31.7969 21.0469L36.0391 25.375C36.1536 25.5 36.1797 25.6302 36.1172 25.7656C36.0547 25.8958 35.9427 25.9609 35.7812 25.9609L34.1719 26.0078L35.3516 28.7188C35.4297 28.9062 35.4297 29.0911 35.3516 29.2734C35.2734 29.4609 35.1406 29.5911 34.9531 29.6641Z"
      fill="black"
    />
  </svg>
);

const MaximizeIcon = () => (
  <svg width="14" height="14" viewBox="563 13 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M564.162 19.2031C563.948 19.2031 563.77 19.1325 563.629 18.9912C563.488 18.8454 563.417 18.6676 563.417 18.458V14.7119C563.417 14.3245 563.524 14.0238 563.738 13.8096C563.957 13.5908 564.262 13.4814 564.654 13.4814H568.441C568.66 13.4814 568.838 13.5521 568.975 13.6934C569.116 13.8346 569.187 14.0124 569.187 14.2266C569.187 14.4453 569.116 14.6253 568.975 14.7666C568.833 14.9033 568.656 14.9717 568.441 14.9717H567.915L565.762 14.8281L567.437 16.4209L569.419 18.3896C569.487 18.4626 569.54 18.5469 569.576 18.6426C569.617 18.7337 569.638 18.8317 569.638 18.9365C569.638 19.1644 569.562 19.349 569.412 19.4902C569.266 19.6315 569.077 19.7021 568.845 19.7021C568.64 19.7021 568.466 19.6315 568.325 19.4902L566.356 17.501L564.764 15.8262L564.907 17.9727V18.458C564.907 18.6722 564.837 18.8499 564.695 18.9912C564.559 19.1325 564.381 19.2031 564.162 19.2031ZM571.552 26.6543C571.338 26.6543 571.158 26.5837 571.012 26.4424C570.87 26.3011 570.8 26.1234 570.8 25.9092C570.8 25.695 570.87 25.5173 571.012 25.376C571.158 25.2347 571.338 25.1641 571.552 25.1641H572.078L574.238 25.3076L572.55 23.7148L570.581 21.7461C570.504 21.6732 570.444 21.5911 570.403 21.5C570.367 21.4043 570.349 21.304 570.349 21.1992C570.349 20.9714 570.424 20.7868 570.574 20.6455C570.725 20.5042 570.914 20.4336 571.142 20.4336C571.356 20.4336 571.531 20.5042 571.668 20.6455L573.63 22.6279L575.229 24.3096L575.086 22.1631V21.6777C575.086 21.4635 575.157 21.2858 575.298 21.1445C575.439 21.0033 575.615 20.9326 575.824 20.9326C576.038 20.9326 576.216 21.0033 576.357 21.1445C576.503 21.2858 576.576 21.4635 576.576 21.6777V25.417C576.576 25.8089 576.467 26.112 576.248 26.3262C576.034 26.5449 575.731 26.6543 575.339 26.6543H571.552Z"
      fill="black"
    />
  </svg>
);

const GreenCheckIcon = () => (
  <svg width="13" height="13" viewBox="146 14 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M150.585 26.1621C150.257 26.1621 149.977 26.0163 149.744 25.7246L146.203 21.2949C146.117 21.1901 146.053 21.0876 146.012 20.9873C145.975 20.887 145.957 20.7845 145.957 20.6797C145.957 20.4427 146.035 20.2467 146.189 20.0918C146.349 19.9368 146.549 19.8594 146.791 19.8594C147.069 19.8594 147.304 19.9847 147.495 20.2354L150.558 24.166L156.491 14.7393C156.596 14.5798 156.703 14.4681 156.812 14.4043C156.922 14.3359 157.063 14.3018 157.236 14.3018C157.473 14.3018 157.667 14.377 157.817 14.5273C157.968 14.6732 158.043 14.8646 158.043 15.1016C158.043 15.1973 158.027 15.2952 157.995 15.3955C157.963 15.4912 157.913 15.5938 157.845 15.7031L151.419 25.7178C151.218 26.014 150.94 26.1621 150.585 26.1621Z"
      fill="#00C10A"
    />
  </svg>
);

// Extracting the default digital circle component
const NumberCircle: React.FC<{ number: number }> = ({ number }) => (
  <div className="flex items-center justify-center flex-none w-5 h-5 rounded-full bg-[#999] text-white text-xs">
    {number}
  </div>
);

// Harmonization icon Packaging sizes, avoid differences. SVG/Component size leads to icon-text spacing“Looks different.”
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

  // Use useMemo Cache icon map to avoid recreated every rendering
  const iconMap = useMemo<Partial<Record<TaskStatus, React.ReactNode>>>(
    () => ({
      [TaskStatus.Success]: <GreenCheckIcon />,
      [TaskStatus.Running]: <Loading />,
    }),
    [],
  );

  // Optimized iconRender Functions
  const iconRender = (index: number) => {
    const task = taskPlan?.[index];
    const status = task?.status;

    if (isFinish) {
      return <GreenCheckIcon />;
    }

    // If the status matches, return the corresponding icon, otherwise return the default digital circle
    return (status && iconMap[status]) || <NumberCircle number={index + 1} />;
  };

  if (!taskPlan?.length) {
    return null;
  }

  if (variant === 'inputTop') {
    const currentTitle = taskPlan?.[currentIndex]?.title;
    const onOpenWorkspace = () => {
      // Record Trigger Source
      setLastWorkspaceAction('user');
      // Update status, trigger a unified notification mechanism
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
