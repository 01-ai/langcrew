import registry from '..';
import ReasoningBriefRenderer from './ReasoningBriefRenderer';

registry.registerMessageType({
  type: 'reasoning',
  briefRenderer: ReasoningBriefRenderer,
});
