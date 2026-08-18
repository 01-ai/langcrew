import registry from '..';
import { ToolIconSearch } from '../common/icons';
import MarkdownResultDetailRenderer from './MarkdownResultDetailRenderer';

registry.registerMessageType({
  // These types produce Markdown
  type: ['knowledge_search', 'chunk_retrieval'],
  detailRenderer: MarkdownResultDetailRenderer,
  icon: ToolIconSearch,
});
