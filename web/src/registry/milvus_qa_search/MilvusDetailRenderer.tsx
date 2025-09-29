import React from 'react';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';
import { DetailRendererProps } from '..';
import { Markdown } from '@/components/Infra';
import { isJsonString } from '@/utils/json';

import { useTranslation } from '@/hooks/useTranslation';

const MilvusDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const { t } = useTranslation();
  const { content } = useToolContent(message as unknown as MessageToolChunk);
  const list = content?.split('\n\n');

  // const markdown = list?.reduce((acc, cur) => {
  //   if (isJsonString(cur)) {
  //     const json = JSON.parse(cur);
  //     // 遍历json的key
  //     for (const key in json) {
  //       acc += `## ${key}\n\n${json[key]}\n\n`;
  //     }
  //     return acc;
  //   }
  //   return `${acc}\n\n${cur}\n\n`;
  // }, '');

  const markdown = list?.reduce((acc, cur) => {
    if (isJsonString(cur)) {
      const json = JSON.parse(cur);
      if (json.question && json.answer) {
        acc += `## ${json.question}\n\n${json.answer}\n\n`;
      }
      if (json.text_emb) {
        acc += `${json.text_emb}\n\n`;
      }
      if (json.entity?.text_emb) {
        acc += `${json.entity.text_emb}\n\n`;
      }
      if (json.entity?.product_name && json.entity?.product_info) {
        const nameTitle = `# ${json.entity?.product_name}\n\n`;
        const info = json.entity.product_info.startsWith(nameTitle)
          ? json.entity.product_info.replace(nameTitle, '')
          : json.entity.product_info;
        acc += `${nameTitle}${info}\n\n`;
      }
      if (json.product_name && json.sex && json.age && json.info && isJsonString(json.info)) {
        const infoJson = JSON.parse(json.info);
        const infoMd = Object.entries(infoJson)
          .map(([key, value]) => `- ${key}：${value}`)
          .join('\n\n');
        acc += `# ${json.product_name}\n\n`;
        acc += `${t('sex')}: ${json.sex}\n\n`;
        acc += `${t('age')}: ${json.age}\n\n`;
        acc += `${t('rateInfo')}: \n\n${infoMd}\n\n`;
      }
      return acc;
    }
    return acc;
  }, '');

  return (
    <div className="w-full h-full overflow-y-auto p-2">
      <Markdown content={markdown} />
    </div>
  );
};

export default MilvusDetailRenderer;
