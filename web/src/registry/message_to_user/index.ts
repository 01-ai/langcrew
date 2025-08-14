import registry from '..';
import MessageNotifyUserBriefRenderer from './MessageNotifyUserBriefRenderer';

registry.registerMessageType({
  type: 'message_to_user',
  briefRenderer: MessageNotifyUserBriefRenderer,
});
