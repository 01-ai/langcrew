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
   * Custom header node
   * Two supported forms:
   * 1. Pass a ReactNode directly
   * 2. Pass a render function that receives chat internals
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
  // Header supports render props or a direct node
  const renderHeader = () => {
    if (!headerNode) {
      return <Welcome />;
    }

    if (typeof headerNode === 'function') {
      // Render-prop mode: pass internal components
      return headerNode({ ChatTitle, ChatFiles, newChat, sessionInfo });
    }

    // Direct render mode
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
