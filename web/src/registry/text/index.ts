import registry from '..';
import TextBriefRenderer from './TextBriefRenderer';

registry.registerMessageType({
  type: 'text',
  briefRenderer: TextBriefRenderer,
});
