import registry from '..';
import { ToolIconSearch } from '../common/icons';
import MarkdownResultDetailRenderer from './MarkdownResultDetailRenderer';

registry.registerMessageType({
  // these types, the result is Markdown
  type: ['knowledge_search', 'chunk_retrieval'],
  detailRenderer: MarkdownResultDetailRenderer,
  icon: ToolIconSearch,
});
