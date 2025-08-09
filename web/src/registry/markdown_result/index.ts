import registry from '..';
import { ToolIconSearch } from '../common/icons';
import MarkdownResultDetailRenderer from './MarkdownResultDetailRenderer';

registry.registerMessageType({
  // 这些类型的，结果是Markdown
  type: ['knowledge_search', 'chunk_retrieval'],
  detailRenderer: MarkdownResultDetailRenderer,
  icon: ToolIconSearch,
});
