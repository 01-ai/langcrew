import registry from '..';
import ErrorBriefRenderer from './ErrorBriefRenderer';

registry.registerMessageType({
  type: 'error',
  briefRenderer: ErrorBriefRenderer,
});
