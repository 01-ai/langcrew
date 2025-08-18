import React, { Fragment, useEffect, useState, useRef } from 'react';
import { ThoughtChain } from '@ant-design/x';
import { Card, Typography } from 'antd';
import { CheckOutlined, WarningOutlined } from '@ant-design/icons';
import { useAgentStore } from '@/store';
import { MessageToolChunk, TaskStatus } from '@/types';
import registry from '@/registry';
import { isToolMessage } from '@/hooks/useChat/utils';
import MessageAttachments from './MessageAttachments';
import ClickableTool from './ClickableTool';
import { Markdown } from '@/components/Infra';
import MessageBrief from '@/registry/common/MessageBrief';
import Loading from '@/components/Infra/Loading';

const Planner = (props: any) => {
  const { data } = props;
  const { Paragraph } = Typography;
  const { setPipelineTargetMessage, sessionInfo } = useAgentStore();

  const sessionStatus = sessionInfo?.status;

  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const prevDataLengthRef = useRef(0);

  const getStepIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.Running:
        return <Loading />;
      case TaskStatus.Success:
        return <CheckOutlined />;
      case TaskStatus.Error:
        return <WarningOutlined />;
      default:
        return;
    }
  };

  const getStepStatus = (status: TaskStatus) => {
    if (status === TaskStatus.Running) {
      return TaskStatus.Pending;
    } else {
      return null;
    }
  };

  const renderContent = (item, idx) => {
    if (registry.getBriefRenderer(item.type)) {
      if (isToolMessage(item as MessageToolChunk)) {
        return (
          <Fragment key={idx}>
            {item.content && <Markdown content={item.content} className="text-sm text-gray-500" />}
            <ClickableTool
              onClick={() => setPipelineTargetMessage(item)}
              active={(item as MessageToolChunk).detail?.status === 'pending'}
            >
              <MessageBrief message={item} />
            </ClickableTool>
          </Fragment>
        );
      }
      return <MessageBrief key={idx} message={item} />;
    }
    return <Paragraph>{item.content}</Paragraph>;
  };

  const items = data.map((step) => ({
    key: step.id,
    title: step.title,
    status: getStepStatus(step.status),
    icon: getStepIcon(step.status),
    description: step.description,
    ...(step?.children?.length && {
      content: (
        <div className="flex flex-col gap-4 pl-2">
          {step.children.map((item, idx) => (
            <Fragment key={idx}>
              {renderContent(item, idx)}
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

    // 如果是首次加载或者有新增的步骤
    if (prevDataLength === 0) {
      // 首次加载时展开所有步骤
      setExpandedKeys(data.map((item) => item.id));
    } else if (currentDataLength > prevDataLength) {
      // 有新增步骤时，只展开新增的步骤，保持现有的展开状态
      const newSteps = data.slice(prevDataLength);
      const newStepIds = newSteps.map((item) => item.id);
      setExpandedKeys((prev) => [...prev, ...newStepIds]);
    }

    // 更新之前的长度
    prevDataLengthRef.current = currentDataLength;
  }, [data]);

  const onExpand = (keys) => {
    setExpandedKeys(keys);
  };

  return (
    <Card className="w-full planner !border-none [&_.ant-card-body]:!p-0">
      <ThoughtChain items={items} collapsible={{ expandedKeys: expandedKeys, onExpand }} />
    </Card>
  );
};

export default Planner;
