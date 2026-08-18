import registry from '..';
import FileDiffDetailRenderer from './FileDiffDetailRenderer';
import { ToolIconFile } from '../common/icons';

registry.registerMessageType({
  type: [
    'read_file',
    'write_file',
    'file_edit',
    /** @deprecated will be removed in next major version */
    'file_read_text',
    /** @deprecated will be removed in next major version */
    'file_append_text',
    /** @deprecated will be removed in next major version */
    'file_replace_text',
  ],
  detailRenderer: FileDiffDetailRenderer,
  icon: ToolIconFile,
});
