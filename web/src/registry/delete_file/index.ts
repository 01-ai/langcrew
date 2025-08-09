import registry from '..';
import DeleteFileDetailRenderer from './DeleteFileDetailRenderer';
import { ToolIconFile } from '../common/icons';

registry.registerMessageType({
  type: 'delete_file',
  detailRenderer: DeleteFileDetailRenderer,
  icon: ToolIconFile,
});
