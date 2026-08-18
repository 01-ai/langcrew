import registry from '..';
import MessageNotifyUserBriefRenderer from '../message_to_user/MessageNotifyUserBriefRenderer';

registry.registerMessageType({
  type: 'message_notify_user',
  briefRenderer: MessageNotifyUserBriefRenderer,
});
