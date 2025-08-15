import registry from '..';
import CodeInterpreterDetailRenderer from './CodeInterpreterDetailRenderer';
import { ToolIconCode } from '../common/icons';

registry.registerMessageType({
  type: 'code_interpreter',
  detailRenderer: CodeInterpreterDetailRenderer,
  icon: ToolIconCode,
});
