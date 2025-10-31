import registry from '..';
import ClaudeSkillDetailRenderer from './ClaudeSkillDetailRenderer';
import { ToolIconCode } from '../common/icons';

registry.registerMessageType({
  type: ['claude_skill', 'claude_skills'],
  detailRenderer: ClaudeSkillDetailRenderer,
  icon: ToolIconCode,
});
