import { createElement, type FC } from 'react';
import registry, { type DetailRendererProps } from '..';
import type { MessageToolChunk } from '@/types';
import ServiceDeployDetailRenderer from './ServiceDeployDetailRenderer';
import { ToolIconCode } from '../common/icons';
import ServiceDeployPreviewRenderer from '../website_delivery/ServiceDeployPreviewRenderer';
import WebsiteDeliveryDetailRenderer from '../website_delivery/WebsiteDeliveryDetailRenderer';
import {
  isServiceDeployPreviewMessage,
  isWebsiteDeliveryMessage,
  SERVICE_DEPLOY_TYPE,
} from '../website_delivery/utils';

const CompatibleServiceDeployDetailRenderer: FC<DetailRendererProps> = (props) => {
  const message = props.message as MessageToolChunk;

  if (isWebsiteDeliveryMessage(message)) {
    return createElement(WebsiteDeliveryDetailRenderer, props);
  }

  if (isServiceDeployPreviewMessage(message)) {
    return createElement(ServiceDeployPreviewRenderer, props);
  }

  return createElement(ServiceDeployDetailRenderer, props);
};

registry.registerMessageType({
  type: SERVICE_DEPLOY_TYPE,
  detailRenderer: CompatibleServiceDeployDetailRenderer,
  icon: ToolIconCode,
});
