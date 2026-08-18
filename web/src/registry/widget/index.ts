import registry from '..';
import { ToolIconBrowser } from '../common/icons';
import ChatkitBriefRenderer from './WidgetBriefRenderer';

registry.registerMessageType({
  type: /^widget/,
  briefRenderer: ChatkitBriefRenderer,
  icon: ToolIconBrowser,
});
