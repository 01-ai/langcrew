import registry from '..';
import LiveStatusBriefRenderer from './TextBriefRenderer';

registry.registerMessageType({
  type: 'live_status',
  briefRenderer: LiveStatusBriefRenderer,
});
