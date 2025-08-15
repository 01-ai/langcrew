import React from 'react';
import { Flex, Layout } from 'antd';
import Chatbot from '@/components/Agent/Chatbot';
import Workspace from '@/components/Agent/Workspace';
import FileViewer from '@/components/Agent/FileViewer';

const Agent = ({ shareButtonNode }: { shareButtonNode?: React.ReactNode }) => {
  return (
    <Layout className="h-screen w-full">
      <Flex className="h-full">
        <Chatbot shareButtonNode={shareButtonNode} />
        <Workspace />
        <FileViewer />
      </Flex>
    </Layout>
  );
};

export default Agent;
