import AgentX, { registerClientAction, registerClientTool } from '@/AgentX';
import { useAgentStore, useAgentStoreApi } from '@/store';
import React, { useEffect } from 'react';
import { toast, Toaster } from 'sonner';

const ChatPage: React.FC = () => {
  const storeApi = useAgentStoreApi();
  useEffect(() => {
    // register client tools
    registerClientTool('switch_theme', async () => {
      return { message: 'Theme switched (fake)' };
    });

    registerClientTool('close_workspace', async () => {
      storeApi.setState({ workspaceVisible: false });
      return { message: 'Workspace closed' };
    });

    registerClientTool('show_notification', async ({ arguments: { level, message } }) => {
      if (toast[level]) {
        toast[level](message);
      } else {
        toast.info(message as string);
      }
      return { message: 'Notification shown' };
    });

    // register client actions
    registerClientAction('open_modal', ({ payload }) => {
      // open modal
    });

    registerClientAction('show_toast', ({ payload }) => {
      if (toast[payload.level]) {
        toast[payload.level](payload.message);
      } else {
        toast.info(payload.message);
      }
    });

    registerClientAction('navigate', ({ payload }) => {
      // navigate to the path
    });
  }, []);

  // Use AgentX directly, matching production
  return (
    <AgentX
      onToolsUpdate={(messages) => {
        console.log('onToolsUpdate', messages);
      }}
      fileUploadConfig={{
        customUploadRequest: async (file) => {
          console.log('customUploadRequest', file);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return Promise.resolve('https://www.baidu.com');
        },
      }}
      onChunks={(chunks) => {
        // console.log('onChunks', chunks);
      }}
      onNewMessage={(message) => {
        // console.log('onNewMessage', message);
      }}
    />
  );
};

export default ChatPage;
