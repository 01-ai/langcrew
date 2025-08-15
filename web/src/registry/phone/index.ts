import registry from '..';
import PhoneDetailRenderer from './PhoneDetailRenderer';
import { ToolIconPhone } from '../common/icons';

registry.registerMessageType({
  type: /^phone/,
  detailRenderer: PhoneDetailRenderer,
  icon: ToolIconPhone,
});
