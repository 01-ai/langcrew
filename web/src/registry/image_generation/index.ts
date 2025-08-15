import registry from '..';
import ImageGenerationDetailRenderer from './ImageGenerationDetailRenderer';
import { ToolIconImage } from '../common/icons';

registry.registerMessageType({
  type: 'image_generation',
  detailRenderer: ImageGenerationDetailRenderer,
  icon: ToolIconImage,
});
