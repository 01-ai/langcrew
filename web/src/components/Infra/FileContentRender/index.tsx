import { Radio } from 'antd';
import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Code from '../Code';
import Markdown from '../Markdown';
import VirtualMarkdown from '../VirtualMarkdown';
import CSVViewer from '../CSVViewer';
import { getContentStats } from '@/utils/markdownBlockParser';
import { FILE_CONTENT_SUPPORT_CONTENT_TYPES, FILE_CONTENT_SUPPORT_FILE_TYPES } from '@/utils/filePreview';

interface FileContentRenderProps {
  /**
   * File Extension
   */
  fileExtension?: string;

  /**
   * Content Type (MIME type)
   */
  contentType?: string;

  /**
   * Contents of the document
   */
  fileContent?: string;
  /**
   * Text of old documents
   */
  oldFileContent?: string;

  /**
   * Whether or not to be a discrepancy document
   */
  isDiff?: boolean;
}

// Supported file type (based on extension)
export const fileContentSupportFileTypes = [...FILE_CONTENT_SUPPORT_FILE_TYPES];

// Type of content supported (based on MIME type）
export const fileContentSupportContentTypes = [...FILE_CONTENT_SUPPORT_CONTENT_TYPES];

const fileTypeToLanguage = {
  html: 'html',
  htm: 'html',
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

const srcDocBaseTag = '<base href="about:srcdoc" />';

const injectSrcDocBaseTag = (html: string) => {
  if (!html) return html;

  if (/<head(\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${srcDocBaseTag}`);
  }

  if (/<html(\s[^>]*)?>/i.test(html)) {
    return html.replace(/<html(\s[^>]*)?>/i, (match) => `${match}<head>${srcDocBaseTag}</head>`);
  }

  return `${srcDocBaseTag}${html}`;
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

  // From contentType Type of file to extract from
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

  // Check if virtual scroll is needed (only for Markdown）
  const markdownStats = useMemo(() => {
    if (detectedType === 'md' && fileContent) {
      return getContentStats(fileContent);
    }
    return null;
  }, [detectedType, fileContent]);

  const htmlPreviewContent = useMemo(() => {
    if (!['html', 'htm'].includes(detectedType)) return fileContent;

    return injectSrcDocBaseTag(fileContent);
  }, [detectedType, fileContent]);

  const renderPreview = () => {
    if (['html', 'htm'].includes(detectedType)) {
      return <iframe srcDoc={htmlPreviewContent} className="w-full h-full" />;
    }
    if (detectedType === 'md') {
      // Select render by file size
      if (markdownStats?.shouldUseVirtual) {
        return <VirtualMarkdown content={fileContent} className="w-full h-full" />;
      }
      return <Markdown content={fileContent} className="w-full h-full" />;
    }
    if (detectedType === 'csv') {
      return <CSVViewer content={fileContent} />;
    }
  };

  // Check if preview mode is supported (based on detected type)
  const supportsPreview =
    fileContentSupportFileTypes.includes(detectedType) || fileContentSupportContentTypes.includes(contentType);

  if (!supportsPreview) {
    return <Code language={language} code={fileContent} originalCode={oldFileContent} isDiff={isDiff} />;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-2">
        <Radio.Group value={previewType} onChange={(e) => setPreviewType(e.target.value)}>
          <Radio.Button value="raw">{t('code.raw')}</Radio.Button>
          <Radio.Button value="preview">{t('code.preview')}</Radio.Button>
        </Radio.Group>
      </div>
      <div className="flex-1 p-3 overflow-auto pt-0">
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
