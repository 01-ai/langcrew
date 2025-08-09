import registry from '..';
import FileDiffDetailRenderer from './FileDiffDetailRenderer';
import { ToolIconFile } from '../common/icons';

registry.registerMessageType({
  type: ['file_read_text', 'file_append_text', 'file_read_text', 'file_replace_text', 'read_file', 'write_file'],
  detailRenderer: FileDiffDetailRenderer,
  icon: ToolIconFile,
});
