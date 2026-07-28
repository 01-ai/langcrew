import React from 'react';
import { Layout } from 'antd';
import Chatbot from '@/components/Agent/Chatbot';
import Workspace from '@/components/Agent/Workspace';
import FileViewer from '@/components/Agent/FileViewer';
import classNames from 'classnames';
import { StartScreenProps } from './Chatbot/StartScreen';
import { PreviewScreenProps } from './Chatbot/PreviewScreen';

import AgentHeader from './AgentHeader';
import { useAgentStore } from '@/store';

import './index.less';
import { AgentxClassNames, AgentxStyles, HeaderNode, WelcomeScreenContext } from '@/types/agentx';

const DEFAULT_CONVERSATION_AREA_BACKGROUND = '#FCFCFC';

const Agent = ({
  basePath,
  agentId,
  sessionId,
  shareButtonNode,
  backButtonNode,
  welcomeScreen,
  startScreen,
  previewScreen,
  menuItems,
  showSenderActions = false,
  headerNode,
  classNames: slotClassNames,
  styles: slotStyles,
}: {
  basePath?: string;
  agentId?: string;
  sessionId?: string;
  shareButtonNode?: React.ReactNode;
  backButtonNode?: React.ReactNode;
  welcomeScreen?: React.ReactNode | ((context: WelcomeScreenContext) => React.ReactNode);
  startScreen?: StartScreenProps;
  previewScreen?: React.ReactNode | PreviewScreenProps;
  menuItems?: {
    key: string;
    label: string;
    icon?: React.ReactNode;
  }[];
  showSenderActions?: boolean;
  headerNode?: HeaderNode;
  classNames?: AgentxClassNames;
  styles?: AgentxStyles;
}) => {
  const { workspaceVisible, fileViewerFile, fileViewerMaximized, disableWorkspaceRendering, layoutConfig } = useAgentStore();
  // embedded Mode (%1)showWorkspace=false）Do not show right working area
  const showWorkspace = layoutConfig.showWorkspace;

  // Only show on the right Workspace or FileViewer One of them (one of them)store (Intra- and intra-specific)
  const rightPanelVisible = showWorkspace && ((!disableWorkspaceRendering && workspaceVisible) || !!fileViewerFile);
  const useTwoColumnSizing = rightPanelVisible && !fileViewerMaximized;
  const useSingleChatSizing = !rightPanelVisible && !fileViewerMaximized;

  const chatFlex = fileViewerMaximized ? '0 0 0px' : '1 1 0px';
  const rightPanelFlex = fileViewerMaximized ? '1 1 0px' : '1 1 0px';

  return (
    <Layout className={classNames('w-full h-full flex flex-col')}>
      {layoutConfig.headerPosition !== 'inner' && (
        <AgentHeader headerNode={headerNode} backButtonNode={backButtonNode} shareButtonNode={shareButtonNode} />
      )}
      {/* When displaying the right panel: add fixed space + Guaranteed ratio to right (matching) Figma） */}
      <div
        className={classNames('flex-1 overflow-hidden flex', slotClassNames?.conversationArea, {
          // New sizing model: gap 1 (margin) = gap 2 (column-gap), right padding 12px,
          // chat max 760px, gap >= 20px, and after chat hits 760px only gap + workspace grow.
          'agentx-two-column': useTwoColumnSizing,
          // Workspace hidden: cap chat at 760px.
          'agentx-single-column': useSingleChatSizing,
          // If file viewer is active (and not maximized), remove right padding to let it touch the edge
          '!pr-0': !!fileViewerFile && !fileViewerMaximized,
          // Preserve existing spacing in other edge modes to avoid regressions.
          'px-8': !useTwoColumnSizing && !useSingleChatSizing && !fileViewerFile,
        })}
        style={{ backgroundColor: DEFAULT_CONVERSATION_AREA_BACKGROUND, ...slotStyles?.conversationArea }}
      >
        <div
          className={classNames('min-w-0 h-full bg-transparent', {
            'agentx-chat-column': useTwoColumnSizing,
            'agentx-chat-single': useSingleChatSizing,
          })}
          style={!useTwoColumnSizing ? { flex: chatFlex } : undefined}
          data-agentx-panel="chat"
        >
          <Chatbot
            basePath={basePath}
            agentId={agentId}
            sessionId={sessionId}
            shareButtonNode={shareButtonNode}
            backButtonNode={backButtonNode}
            welcomeScreen={welcomeScreen}
            startScreen={startScreen}
            previewScreen={previewScreen}
            menuItems={menuItems}
            showSenderActions={showSenderActions}
            headerNode={headerNode}
          />
        </div>

        {rightPanelVisible && (
          <div
            className={classNames('min-w-0 h-full bg-transparent', { 'agentx-right-column': useTwoColumnSizing })}
            style={!useTwoColumnSizing ? { flex: rightPanelFlex } : undefined}
            data-agentx-panel="right"
          >
            {!disableWorkspaceRendering && <Workspace />}
            <FileViewer />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Agent;
