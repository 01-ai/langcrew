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
   * 内容类型 (MIME type)
   */
  contentType?: string;

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

// 支持的文件类型（基于扩展名）
export const fileContentSupportFileTypes = ['html', 'md', 'csv'];

// 支持的内容类型（基于 MIME type）
export const fileContentSupportContentTypes = ['text/html', 'text/markdown', 'text/csv'];

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
  contentType = '',
  fileContent = '',
  oldFileContent = '',
  isDiff,
}) => {
  const [previewType, setPreviewType] = useState<'preview' | 'raw'>('preview');
  const { t } = useTranslation();

  // 从 contentType 中提取文件类型
  const getTypeFromContentType = (ct: string) => {
    if (ct.includes('text/markdown') || ct.includes('markdown')) return 'md';
    if (ct.includes('text/html') || ct.includes('html')) return 'html';
    if (ct.includes('text/csv') || ct.includes('csv')) return 'csv';
    if (ct.includes('text/plain') || ct.includes('plain')) return 'txt';
    return null;
  };

  const detectedType = getTypeFromContentType(contentType) || fileExtension;

  const language =
    (fileTypeToLanguage[detectedType as keyof typeof fileTypeToLanguage] as any) || detectedType || 'plaintext';

  const renderPreview = () => {
    if (detectedType === 'html') {
      return <iframe srcDoc={fileContent} className="w-full h-full" />;
    }
    if (detectedType === 'md') {
      return <Markdown content={fileContent} className="w-full h-full" />;
    }
    if (detectedType === 'csv') {
      return <CSVViewer content={fileContent} />;
    }
  };

  // 检查是否支持预览模式（基于检测到的类型）
  const supportsPreview =
    fileContentSupportFileTypes.includes(detectedType) || fileContentSupportContentTypes.includes(contentType);

  if (!supportsPreview) {
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
