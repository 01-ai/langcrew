import React, { useState, useEffect } from 'react';
import { ThoughtChain } from '@ant-design/x';
import { Card, Flex, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { TaskStatus } from '@/types';

const Thinking = (props: any) => {
  const { data } = props;
  const [expandedKeys, setExpandedKeys] = useState(['thinking']);

  const items = [
    {
      key: 'thinking',
      title: 'Deep Thinking…',
      status: data.status,
      icon: <Spin indicator={<LoadingOutlined />} spinning={data.status === TaskStatus.Pending ? true : false} />,
      content: data.content,
    },
  ];

  useEffect(() => {
    if (data.status === TaskStatus.Success) {
      setExpandedKeys([]);
    }

    if (data.status === TaskStatus.Pending) {
      setExpandedKeys(['thinking']);
    }
  }, [data.status]);

  return (
    <Card className="w-full planner">
      <ThoughtChain
        items={items}
        collapsible={{
          expandedKeys,
          onExpand: (keys: string[]) => {
            setExpandedKeys(keys);
          },
        }}
      />
    </Card>
  );
};

export default Thinking;

// Example:
/*
  <Thinking
  data={{
    status: 'pending',
    content:
      '首先，回顾之前的对话历史，用户可能是在测试我的响应能力，或者可能接下来会有更具体的问题。根据指示，如果用户的问题不明确或没有具体内容，我应该引导他们提供更多细节。还要注意用户可能的需求，比如他们可能希望得到某个特定主题的详细解释，或者解决某个具体问题。因此，回复应该开放且具体，让用户明确如何进一步提问。例如，可以问：“您有什么具体的问题或需要哪方面的帮助呢？比如技术问题、日常生活建议、学习辅导等，我可以为您提供详细的解答。”这样既符合用户当前的提问，也引导他们给出更多信息，以便我能更好地提供帮助。',
  }}
  />
*/
