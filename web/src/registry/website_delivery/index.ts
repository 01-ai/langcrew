import registry from '..';
import { ToolIconCode } from '../common/icons';
import WebsiteDeliveryDetailRenderer from './WebsiteDeliveryDetailRenderer';
export {
  findCompletedWebsiteDelivery,
  isCompletedWebsiteDeliveryMessage,
  isServiceDeployPreviewMessage,
  isWebsiteDeliveryMessage,
  isWebsitePreviewMessage,
  isWebsiteType,
  SERVICE_DEPLOY_TYPE,
  WEBSITE_DELIVERY_TYPES,
} from './utils';

registry.registerMessageType({
  type: 'website_delivery',
  detailRenderer: WebsiteDeliveryDetailRenderer,
  icon: ToolIconCode,
});
