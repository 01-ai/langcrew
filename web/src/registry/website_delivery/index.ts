import { createElement, type FC } from 'react';
import registry, { type DetailRendererProps } from '..';
import { ToolIconCode } from '../common/icons';
import DefaultDetailRenderer from '../default/DefaultDetailRenderer';
import ServiceDeployPreviewRenderer from './ServiceDeployPreviewRenderer';
import WebsiteDeliveryDetailRenderer from './WebsiteDeliveryDetailRenderer';
import { MessageToolChunk } from '@/types';
import { isServiceDeployPreviewMessage, isWebsiteDeliveryMessage, SERVICE_DEPLOY_TYPE } from './utils';
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

const ServiceDeployDetailRenderer: FC<DetailRendererProps> = (props) => {
  if (isWebsiteDeliveryMessage(props.message as MessageToolChunk)) {
    return createElement(WebsiteDeliveryDetailRenderer, props);
  }

  if (isServiceDeployPreviewMessage(props.message as MessageToolChunk)) {
    return createElement(ServiceDeployPreviewRenderer, props);
  }

  return createElement(DefaultDetailRenderer, props);
};

registry.registerMessageType({
  type: 'website_delivery',
  detailRenderer: WebsiteDeliveryDetailRenderer,
  icon: ToolIconCode,
});

registry.registerMessageType({
  type: SERVICE_DEPLOY_TYPE,
  detailRenderer: ServiceDeployDetailRenderer,
  icon: ToolIconCode,
});
