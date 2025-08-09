import registry from '..';
import PlanBriefRenderer from './PlanBriefRenderer';

registry.registerMessageType({
  type: 'plan',
  briefRenderer: PlanBriefRenderer,
});
