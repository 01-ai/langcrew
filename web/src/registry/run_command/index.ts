import registry from '..';
import RunCommandDetailRenderer from './RunCommandDetailRenderer';
import { ToolIconCode } from '../common/icons';

registry.registerMessageType({
  type: 'run_command',
  detailRenderer: RunCommandDetailRenderer,
  icon: ToolIconCode,
});
