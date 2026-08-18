import React, { Fragment, useEffect, useState, useRef } from 'react';
import { ThoughtChain } from '@ant-design/x';
import { Card, Typography } from 'antd';
import { CheckOutlined, WarningOutlined } from '@ant-design/icons';
import { useAgentStore } from '@/store';
import { CitationSource, MessageChunk, MessageToolChunk, PlanStep, TaskStatus } from '@/types';
import registry from '@/registry';
import { filterEmptySteps, isToolMessage } from '@/hooks/useChat/utils';
import MessageAttachments from './MessageAttachments';
import { Markdown } from '@/components/Infra';
import MessageBrief from '@/registry/common/MessageBrief';
import Loading from '@/components/Infra/Loading';
import ToolRender from './ToolRender';
import ExpandCollapseIcon from './ExpandCollapseIcon';
import './planner.less';

const StepTitle = ({ step, expanded, icon }: { step: PlanStep; expanded: boolean; icon: React.ReactNode }) => {
  const hasChildren = (step?.children?.length ?? 0) > 0;
  return (
    <div className="planner-step-title group cursor-pointer">
      <span className="planner-step-title-icon">{icon}</span>
      <span className="planner-step-title-text">{step.title}</span>
      {hasChildren && (
        <span className="planner-step-expand-icon">
          <ExpandCollapseIcon expanded={expanded} />
        </span>
      )}
    </div>
  );
};

interface PlannerProps {
  data?: PlanStep[];
  citations?: CitationSource[];
}

const Planner = ({ data = [], citations }: PlannerProps) => {
  const { Paragraph } = Typography;
  const { layoutConfig } = useAgentStore();

  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const prevDataLengthRef = useRef(0);

  const getStepIcon = (status?: TaskStatus | string) => {
    // Some upstreams may send non-standard status strings (e.g. "done").
    // UX requirement: show a running indicator when the step is not done.
    if (status === TaskStatus.Error) return <WarningOutlined />;
    if (status === TaskStatus.Success || status === 'done') {
      return (
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#999] text-white">
          <CheckOutlined style={{ fontSize: 12 }} />
        </div>
      );
    }
    return <Loading size={20} />;
  };

  const getStepStatus = (status?: TaskStatus | string): 'loading' | 'success' | 'error' | undefined => {
    if (status === TaskStatus.Error) return 'error';
    if (status === TaskStatus.Success || status === 'done') return 'success';
    if (status === TaskStatus.Running) return 'loading';
    return undefined;
  };

  const renderContent = (item: MessageChunk) => {
    if (registry.getBriefRenderer(item.type)) {
      if (isToolMessage(item as MessageToolChunk)) {
        return (
          <div className="flex flex-col gap-2 w-full max-w-full">
            {item.content && (
              <Markdown
                content={item.content}
                citations={citations}
                className="!text-[16px] !leading-[28px] !text-[#000]"
              />
            )}
            <ToolRender message={item as MessageToolChunk} />
          </div>
        );
      }
      return <MessageBrief key={item.id} message={item} citations={citations} />;
    }
    return <Paragraph>{item.content}</Paragraph>;
  };

  // Important: plan step children are appended by streaming logic, and those updates may mutate
  // the existing step objects/arrays in-place. If we memoize `items` only by `data` reference,
  // the UI can get stuck and not show newly appended tool calls until the plan finishes.
  const items = filterEmptySteps(data).map((step: PlanStep) => ({
    key: step.id,
    title: <StepTitle step={step} expanded={expandedKeys.includes(step.id)} icon={getStepIcon(step.status)} />,
    status: getStepStatus(step.status),
    description: step.description,
    collapsible: true,
    ...(step?.children?.length && {
      content: (
        <div className="agentx-plan-step-content flex flex-col gap-3 pl-[18px] pt-3 border-dashed border-[#eaeaea] ml-[9px] mb-0 pb-0">
          {step.children.map((item, idx) => (
            <Fragment key={idx}>
              {renderContent(item)}
              <MessageAttachments message={item} />
            </Fragment>
          ))}
        </div>
      ),
    }),
  }));

  useEffect(() => {
    const currentDataLength = data.length;
    const prevDataLength = prevDataLengthRef.current;

    if (prevDataLength === 0) {
      setExpandedKeys(data.map((item: any) => item.id));
    } else if (currentDataLength > prevDataLength) {
      const newSteps = data.slice(prevDataLength);
      const newStepIds = newSteps.map((item: any) => item.id);
      setExpandedKeys((prev) => [...prev, ...newStepIds]);
    }

    prevDataLengthRef.current = currentDataLength;
  }, [data]);

  const onExpand = (keys: string[]) => {
    setExpandedKeys(keys);
  };

  return (
    <Card className="w-full planner !border-none [&_.ant-card-body]:!p-0 !bg-transparent shadow-none">
      <ThoughtChain
        items={items}
        expandedKeys={expandedKeys}
        onExpand={onExpand}
        classNames={{
          itemContent: layoutConfig.narrowMode ? 'w-full' : '',
          item: '!pb-0',
        }}
      />
    </Card>
  );
};

export default Planner;
