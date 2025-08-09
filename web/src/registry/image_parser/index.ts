import registry from '..';
import ImageParserDetailRenderer from './ImageParserDetailRenderer';
import { ToolIconImage } from '../common/icons';

registry.registerMessageType({
  type: 'image_parser',
  detailRenderer: ImageParserDetailRenderer,
  icon: ToolIconImage,
});
