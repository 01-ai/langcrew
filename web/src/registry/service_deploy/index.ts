import registry from '..';
import ServiceDeployDetailRenderer from './ServiceDeployDetailRenderer';
import { ToolIconCode } from '../common/icons';

registry.registerMessageType({
  type: 'service_deploy',
  detailRenderer: ServiceDeployDetailRenderer,
  icon: ToolIconCode,
});
