import registry from '..';
import { ToolIconSearch } from '../common/icons';
import WebSearchDetailRenderer from './WebSearchDetailRenderer';

registry.registerMessageType({
  type: 'web_search',
  detailRenderer: WebSearchDetailRenderer,
  icon: ToolIconSearch,
});
