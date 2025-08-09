import { Radio } from 'antd';
import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Code from '../Code';
import Markdown from '../Markdown';
import CSVViewer from '../CSVViewer';

interface FileContentRenderProps {
  /**
   * 文件扩展名
   */
  fileExtension?: string;

  /**
   * 文件内容
   */
  fileContent?: string;
  /**
   * 旧文件内容
   */
  oldFileContent?: string;

  /**
   * 是否是差异文件
   */
  isDiff?: boolean;
}

// 后缀名
export const fileContentSupportFileTypes = ['html', 'md', 'csv'];

const fileTypeToLanguage = {
  md: 'markdown',
  markdown: 'markdown',
  py: 'python',
  sh: 'shell',
  bash: 'shell',
  txt: 'plaintext',
  log: 'plaintext',
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  yml: 'yaml',
  h: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  csv: 'csv',
  sql: 'sql',
};

const FileContentRender: React.FC<FileContentRenderProps> = ({
  fileExtension = '',
  fileContent = '',
  oldFileContent = '',
  isDiff,
}) => {
  const [previewType, setPreviewType] = useState<'preview' | 'raw'>('preview');
  const { t } = useTranslation();

  const language =
    (fileTypeToLanguage[fileExtension as keyof typeof fileTypeToLanguage] as any) || fileExtension || 'plaintext';

  const renderPreview = () => {
    if (fileExtension === 'html') {
      return <iframe srcDoc={fileContent} className="w-full h-full" />;
    }
    if (fileExtension === 'md') {
      return <Markdown content={fileContent} className="w-full h-full" />;
    }
    if (fileExtension === 'csv') {
      return <CSVViewer content={fileContent} />;
    }
  };

  if (!fileContentSupportFileTypes.includes(fileExtension)) {
    return <Code language={language} code={fileContent} originalCode={oldFileContent} isDiff={isDiff} />;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-2">
        <Radio.Group value={previewType} onChange={(e) => setPreviewType(e.target.value)}>
          <Radio.Button value="preview">{t('code.preview')}</Radio.Button>
          <Radio.Button value="raw">{t('code.raw')}</Radio.Button>
        </Radio.Group>
      </div>
      <div className="flex-1 p-3 overflow-auto">
        {previewType === 'preview' ? (
          renderPreview()
        ) : (
          <Code language={language} code={fileContent} originalCode={oldFileContent} isDiff={isDiff} />
        )}
      </div>
    </div>
  );
};

export default FileContentRender;
