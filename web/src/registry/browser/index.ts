import registry from '..';
import { ToolIconBrowser } from '../common/icons';
import BrowserDetailRenderer from './BrowserDetailRenderer';

registry.registerMessageType({
  type: /^browser/,
  detailRenderer: BrowserDetailRenderer,
  icon: ToolIconBrowser,
});
