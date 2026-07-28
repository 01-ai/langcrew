import registry from '..';
import ClaudeSkillDetailRenderer from './ClaudeSkillDetailRenderer';
import { ToolIconCode } from '../common/icons';

registry.registerMessageType({
  type: /_skills_/,
  detailRenderer: ClaudeSkillDetailRenderer,
  icon: ToolIconCode,
});
