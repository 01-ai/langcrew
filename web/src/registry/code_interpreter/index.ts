import registry from '..';
import CodeInterpreterDetailRenderer from './CodeInterpreterDetailRenderer';
import { ToolIconCode } from '../common/icons';

registry.registerMessageType({
  type: ['code_interpreter', 'python_executor'],
  detailRenderer: CodeInterpreterDetailRenderer,
  icon: ToolIconCode,
});
