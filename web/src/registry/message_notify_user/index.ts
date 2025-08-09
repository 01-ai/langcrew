import registry from '..';
import MessageNotifyUserBriefRenderer from './MessageNotifyUserBriefRenderer';

registry.registerMessageType({
  type: 'message_notify_user',
  briefRenderer: MessageNotifyUserBriefRenderer,
});
