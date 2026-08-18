import registry from '@/registry';

type WorkspaceMessage = {
  id?: string | number;
  type?: string;
};

export const isWorkspaceDisabledForMessage = (message?: WorkspaceMessage | null) =>
  !!message?.type && registry.getMessageType(message.type)?.disableWorkspace === true;

export const getActiveWorkspaceMessage = <T extends WorkspaceMessage>(
  workspaceMessages: T[],
  pipelineTargetMessage?: T | null,
) => {
  if (pipelineTargetMessage?.id) {
    return workspaceMessages.find((message) => message.id === pipelineTargetMessage.id) ?? pipelineTargetMessage;
  }

  return workspaceMessages.at(-1);
};

export const shouldShowWorkspacePanel = (
  workspaceVisible: boolean,
  disableWorkspaceRendering: boolean,
  message?: WorkspaceMessage | null,
) => workspaceVisible && !disableWorkspaceRendering && !isWorkspaceDisabledForMessage(message);
