import React from 'react';
import Sender from '@/components/Agent/Chatbot/Sender';
import Welcome from '@/components/Agent/Chatbot/Welcome';
import { ChatTitle, ChatTitleProps } from '@/components/Agent/Chatbot/ChatTitle';
import { ChatFiles, ChatFilesProps } from '@/components/Agent/Chatbot/ChatFiles';
import { useAgentStore, useAgentStoreApi } from '@/store';
import { HeaderNode } from '@/types';
import classNames from 'classnames';

export interface HomeProps {
  senderVisible?: boolean;
  /**
   * Custom Header Nodes
   * Two approaches are supported:
   * 1. Directly in ReactNode
   * 2. Import render function，Receive AgentX Internal component
   */
  headerNode?: HeaderNode;
  footerNode?: React.ReactNode;
  menuItems?: {
    key: string;
    label: string;
    icon?: React.ReactNode;
  }[];
  showSenderActions?: boolean;
  homeClassName?: string;
  homeContentClassName?: string;
  homeSenderClassName?: string;
}

const Home: React.FC<HomeProps> = ({
  senderVisible = true,
  headerNode,
  footerNode,
  menuItems,
  showSenderActions = false,
  homeClassName,
  homeContentClassName,
  homeSenderClassName,
}) => {
  const { sessionInfo } = useAgentStore();
  const storeApi = useAgentStoreApi();
  const newChat = () => {
    storeApi.getState().resetStore();
  };
  // Render header：Support render props Or render it directly.
  const renderHeader = () => {
    if (!headerNode) {
      return <Welcome />;
    }

    if (typeof headerNode === 'function') {
      // render props Mode: Import internal components
      return headerNode({ ChatTitle, ChatFiles, newChat, sessionInfo });
    }

    // Direct Rendering Mode
    return headerNode;
  };

  return (
    <div
      className={classNames(
        'h-full w-full bg-cover bg-no-repeat overflow-auto',
        !homeClassName && 'py-14',
        homeClassName,
      )}
    >
      <div
        className={classNames(
          'max-w-[760px] mx-auto h-full w-full flex flex-col items-center',
          !homeContentClassName && 'gap-[60px] justify-center',
          homeContentClassName,
        )}
      >
        {renderHeader()}
        {senderVisible && (
          <div className={classNames('w-full', homeSenderClassName)}>
            <Sender menuItems={menuItems} showSenderActions={showSenderActions} />
          </div>
        )}
        {footerNode ? footerNode : null}
      </div>
    </div>
  );
};

export default Home;
