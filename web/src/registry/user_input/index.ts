import registry from '..';
import UserInputBriefRenderer from './UserInputBriefRenderer';

registry.registerMessageType({
  type: 'user_input',
  briefRenderer: UserInputBriefRenderer,
}); 