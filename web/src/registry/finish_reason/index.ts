import registry from '..';
import FinishReasonBriefRenderer from './FinishReasonBriefRenderer';

registry.registerMessageType({
  type: 'finish_reason',
  briefRenderer: FinishReasonBriefRenderer,
}); 