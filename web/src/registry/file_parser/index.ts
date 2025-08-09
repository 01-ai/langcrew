import registry from '..';
import FileParserDetailRenderer from './FileParserDetailRenderer';
import { ToolIconFile } from '../common/icons';

registry.registerMessageType({
  type: 'file_parser',
  detailRenderer: FileParserDetailRenderer,
  icon: ToolIconFile,
});
