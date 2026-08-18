import { getLanguage } from '@/hooks/useTranslation';
import type { AgentTool } from '@/types';

export const getToolName = (item: AgentTool) => {
  const lang = getLanguage();
  const localized = item.ext?.[`name_${lang}`];
  if (localized) return localized;
  if (lang !== 'zh' && item.ext?.name_en) return item.ext.name_en;
  return item.name;
};
