import React, { useEffect, useMemo, useState } from 'react';
import { Empty, Spin, Tree, message as antdMessage } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import type { TreeDataNode } from 'antd';

import { DetailRendererProps } from '..';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';
import { useAgentStore } from '@/store';
import { isJsonString } from '@/utils/json';
import FileReader from '@/components/Infra/FileReader';
import { getFileExtension } from '@/utils/parser';
import { useUrlContent } from '@/hooks/useUrlContent';
import { useTranslation } from '@/hooks/useTranslation';
import websiteDeliveryIconUrl from '@/assets/svg/website_delivery.svg';
import refreshIconUrl from '@/assets/svg/refresh.svg';
import shareIconUrl from '@/assets/svg/share.svg';
import closeIconUrl from '@/assets/svg/close.svg';
import DirDownIcon from '@/assets/svg/tools/dir-down.svg?react';
import './index.less';

type WebsiteDeliveryFile = {
  path: string;
  url: string;
  size?: number;
  content_type?: string;
};

type WebsiteDeliveryZip = {
  filename?: string;
  url: string;
  size?: number;
  content_type?: string;
};

type WebsiteDeliveryResponse = {
  success: boolean;
  preview_url?: string;
  code?: {
    files?: WebsiteDeliveryFile[];
  };
  zip?: WebsiteDeliveryZip;
  message?: string;
  website_name?: string;
};

type WebsiteDeliveryMode = 'code' | 'preview';

type WebsiteDeliveryTreeNode = {
  key: string; // full path
  name: string;
  type: 'dir' | 'file';
  children?: WebsiteDeliveryTreeNode[];
  file?: WebsiteDeliveryFile;
};

const parseResponse = (raw: string): WebsiteDeliveryResponse | null => {
  if (!raw || !isJsonString(raw)) return null;
  try {
    return JSON.parse(raw) as WebsiteDeliveryResponse;
  } catch {
    return null;
  }
};

const buildTree = (files: WebsiteDeliveryFile[]): WebsiteDeliveryTreeNode[] => {
  const root: WebsiteDeliveryTreeNode = { key: '__root__', name: '__root__', type: 'dir', children: [] };

  const ensureDir = (parent: WebsiteDeliveryTreeNode, name: string, fullPath: string): WebsiteDeliveryTreeNode => {
    const existing = (parent.children || []).find((c) => c.type === 'dir' && c.key === fullPath);
    if (existing) return existing;
    const node: WebsiteDeliveryTreeNode = { key: fullPath, name, type: 'dir', children: [] };
    parent.children = [...(parent.children || []), node];
    return node;
  };

  for (const file of files) {
    const parts = (file.path || '').split('/').filter(Boolean);
    if (parts.length === 0) continue;
    let current = root;
    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;
      if (!isLast) {
        current = ensureDir(current, part, currentPath);
        continue;
      }
      const leaf: WebsiteDeliveryTreeNode = {
        key: currentPath,
        name: part,
        type: 'file',
        file,
      };
      current.children = [...(current.children || []), leaf];
    }
  }

  const sortNodes = (nodes: WebsiteDeliveryTreeNode[]): WebsiteDeliveryTreeNode[] => {
    return [...nodes]
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((n) => (n.children ? { ...n, children: sortNodes(n.children) } : n));
  };

  return sortNodes(root.children || []);
};

const buildAntdTreeData = (nodes: WebsiteDeliveryTreeNode[]): TreeDataNode[] => {
  const mapNode = (n: WebsiteDeliveryTreeNode): TreeDataNode => {
    if (n.type === 'dir') {
      return {
        key: n.key,
        title: n.name,
        children: (n.children || []).map(mapNode),
      };
    }

    return {
      key: n.key,
      title: n.name,
      isLeaf: true,
    };
  };

  return nodes.map(mapNode);
};

const formatPathBreadcrumb = (path: string): React.ReactNode => {
  const parts = (path || '').split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const dirParts = parts.slice(0, -1);
  const filePart = parts[parts.length - 1];
  return (
    <p className="leading-[16px] text-[14px]">
      {dirParts.length > 0 && <span className="text-[#999]">{dirParts.join(' / ')} / </span>}
      <span className="text-black">{filePart}</span>
    </p>
  );
};

const getLanguageFromPath = (path: string): string => {
  const ext = getFileExtension(path);
  const map: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    css: 'css',
    less: 'less',
    scss: 'scss',
    json: 'json',
    md: 'markdown',
    html: 'html',
    xml: 'xml',
    yml: 'yaml',
    yaml: 'yaml',
    py: 'python',
    sh: 'shell',
    bash: 'shell',
  };
  return map[ext] || 'plaintext';
};

const isLikelyText = (file: WebsiteDeliveryFile): boolean => {
  const ct = file.content_type || '';
  if (ct.startsWith('text/')) return true;
  if (ct.includes('javascript') || ct.includes('json') || ct.includes('xml') || ct.includes('yaml')) return true;
  const ext = getFileExtension(file.path);
  return (
    [
      'txt',
      'log',
      'md',
      'csv',
      'json',
      'xml',
      'yaml',
      'yml',
      'ini',
      'conf',
      'cfg',
      'properties',
      'toml',
      'js',
      'jsx',
      'ts',
      'tsx',
      'py',
      'sh',
      'bash',
      'html',
      'css',
      'less',
      'scss',
    ] as string[]
  ).includes(ext);
};

const appendQueryParam = (url: string, key: string, value: string): string => {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set(key, value);
    return u.toString();
  } catch {
    // Fallback for non-standard URLs (e.g. relative paths)
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
};

const WebsiteDeliveryDetailRenderer: React.FC<DetailRendererProps> = ({ message }) => {
  const toolMessage = message as unknown as MessageToolChunk;
  const { content } = useToolContent(toolMessage);
  const data = content;//useMemo(() => parseResponse(content), [content]);
  const toolStatus = toolMessage?.detail?.status;
  const { setWorkspaceVisible, setFileViewerFile, setLastWorkspaceAction } = useAgentStore();
  const { t } = useTranslation();

  const files = useMemo(() => (data?.code?.files || []).filter((f) => f?.path && f?.url), [data?.code?.files]);
  const tree = useMemo(() => buildTree(files), [files]);
  const antdTreeData = useMemo(() => buildAntdTreeData(tree), [tree]);
  const defaultExpandedKeys = useMemo(() => tree.filter((n) => n.type === 'dir').map((n) => n.key), [tree]);

  const [mode, setMode] = useState<WebsiteDeliveryMode>('preview');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const selectedFile = useMemo(() => files.find((f) => f.path === selectedKey) || null, [files, selectedKey]);
  const selectedFileIsText = selectedFile ? isLikelyText(selectedFile) : false;
  const [refreshSeed, setRefreshSeed] = useState<number>(0);
  const [previewRefreshKey, setPreviewRefreshKey] = useState<number>(0);
  const {
    data: fileText,
    loading: fileLoading,
    error: fileError,
  } = useUrlContent({
    url:
      selectedFile && selectedFileIsText ? appendQueryParam(selectedFile.url, '__refresh', String(refreshSeed)) : null,
    contentType: selectedFile?.content_type,
  });

  useEffect(() => {
    if (!selectedKey && files.length > 0) {
      // Prefer index.html when present
      const indexHtml = files.find((f) => f.path === 'index.html');
      const nextKey = (indexHtml || files[0]).path;
      setSelectedKey(nextKey);
    }
  }, [files, selectedKey]);

  const handleDownload = () => {
    const url = data?.zip?.url;
    if (!url) return;
    // Trigger download (some browsers ignore download; also open a new tab)
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.download = data?.zip?.filename || 'website.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefresh = () => {
    // Refresh the preview iframe and refetch the selected text file
    setPreviewRefreshKey((k) => k + 1);
    setRefreshSeed(Date.now());
  };

  const handleShare = async () => {
    const url = data?.preview_url;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      antdMessage.success(t('link.copied'));
    } catch {
      // clipboard API may be missing; fall back to a copy helper
      try {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        antdMessage.success(t('link.copied'));
      } catch {
        antdMessage.error(t('link.copy_failed'));
      }
    }
  };

  const handleClose = () => {
    // Close the right panel (workspace/fileViewer)
    setLastWorkspaceAction('user');
    setFileViewerFile(undefined);
    setWorkspaceVisible(false);
  };

  const switcherIcon = useMemo(
    () => () =>
    (
      <div className="w-full h-full flex items-center justify-center">
        <DirDownIcon />
      </div>
    ),
    [],
  );

  const containerClassName = 'w-full h-full bg-white border border-[#eaeaea] rounded-[20px] overflow-hidden';

  // Tool running: show loading (same as other tools)
  if (toolStatus === 'running' || toolStatus === 'pending') {
    return (
      <div className={containerClassName}>
        <div className="w-full h-full flex items-center justify-center">
          <Spin spinning />
        </div>
      </div>
    );
  }

  // No valid result yet: render the shell only
  if (!data) {
    return <div className={containerClassName} />;
  }

  if (data?.success === false) {
    return (
      <div className="w-full h-full p-4 bg-white">
        <div className="text-[14px] font-medium mb-2">{t('website_delivery.failed')}</div>
        <div className="text-[#666] text-[12px] whitespace-pre-wrap break-words">{data.message || t('error.unknown')}</div>
      </div>
    );
  }

  const titleText = data.website_name || t('website_delivery.default_name');

  return (
    <div className={containerClassName}>
      {/* Header (Figma: left icon + title; right controls) */}
      <div className="flex justify-between items-center h-[56px] w-full px-[15px]">
        <div className="flex items-center gap-[8px] overflow-hidden">
          <div className="flex-shrink-0 bg-[#f3f3f3] border border-[#ebebeb] rounded-[6px] w-[24px] h-[24px] flex items-center justify-center">
            <img src={websiteDeliveryIconUrl} alt="website delivery" className="w-[13px] h-[13px]" />
          </div>
          <div className="text-[14px] leading-[20px] text-black flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
            {titleText}
          </div>
        </div>

        {/* Right controls (Figma: single row, gap 12px between items) */}
        <div className="flex-1 h-[36px] flex items-center justify-end gap-[12px]">
          {/* Refresh / Share: only visible in Preview mode */}
          {mode === 'preview' && (
            <>
              <button
                type="button"
                aria-label={t('action.refresh')}
                className="w-[24px] h-[24px] p-[4px] flex items-center justify-center rounded-[4px] transition-colors cursor-pointer hover:bg-[#f3f3f3] active:bg-[#ebebeb]"
                onClick={handleRefresh}
              >
                <img src={refreshIconUrl} alt="refresh" className="w-[15px] h-[16px]" />
              </button>

              <button
                type="button"
                aria-label={t('action.share')}
                className="w-[24px] h-[24px] p-[4px] flex items-center justify-center rounded-[4px] transition-colors cursor-pointer hover:bg-[#f3f3f3] active:bg-[#ebebeb] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:active:bg-transparent"
                onClick={handleShare}
                disabled={!data.preview_url}
              >
                <img src={shareIconUrl} alt="share" className="w-[16px] h-[16px]" />
              </button>
            </>
          )}

          {/* Segmented control (preview/code) */}
          <div className="rounded-[8px] h-[36px] overflow-hidden flex bg-white">
            <button
              type="button"
              className={`h-full px-[16px] flex items-center justify-center text-[14px] leading-[22px] rounded-l-[8px] border transition-colors cursor-pointer whitespace-nowrap  ${mode === 'code' ? 'border-r-0' : ''
                } ${mode === 'preview'
                  ? 'border-[#2051C9] text-[#2051C9]'
                  : 'border-[#d9d9d9] text-[#999] hover:text-[#2051C9] hover:border-[#2051C9]'
                }`}
              onClick={() => setMode('preview')}
            >
              {t('code.preview')}
            </button>
            <button
              type="button"
              className={`h-full px-[16px] flex items-center justify-center text-[14px] leading-[22px] rounded-r-[8px] border transition-colors cursor-pointer whitespace-nowrap  ${mode === 'preview' ? 'border-l-0' : ''
                } ${mode === 'code'
                  ? 'border-[#2051C9] text-[#2051C9]'
                  : 'border-[#d9d9d9] text-[#999] hover:text-[#2051C9] hover:border-[#2051C9]'
                }`}
              onClick={() => setMode('code')}
            >
              {t('code.raw')}
            </button>
          </div>

          {/* Download button */}
          <button
            type="button"
            className="h-[36px] box-border border border-[#d8d8d8] rounded-[8px] px-[12px] py-[8px] flex items-center gap-[4px] text-black text-[14px] leading-[20px] transition-colors cursor-pointer hover:text-[#2051C9] hover:border-[#2051C9] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-black disabled:hover:border-[#d8d8d8] whitespace-nowrap "
            onClick={handleDownload}
            disabled={!data.zip?.url}
          >
            <DownloadOutlined className="text-[14px] leading-none" />
            {t('attachment.download')}
          </button>

          {/* Close (Figma) */}
          <button
            type="button"
            aria-label={t('button.close')}
            className="w-[24px] h-[24px] p-[4px] flex items-center justify-center rounded-[4px] transition-colors cursor-pointer hover:bg-[#f3f3f3] active:bg-[#ebebeb]"
            onClick={handleClose}
          >
            <img src={closeIconUrl} alt="close" className="w-[15px] h-[16px]" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="w-full h-[calc(100%-56px)] px-[15px] pb-[15px] bg-white">
        <div className="w-full h-full border border-[#eaeaea] rounded-[12px] overflow-hidden">
          {mode === 'preview' ? (
            <iframe
              key={previewRefreshKey}
              title="website-preview"
              src={appendQueryParam(data.preview_url || '', '__refresh', String(refreshSeed))}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex">
              {/* Left: file tree (Figma width ~148) */}
              <div className="w-[200px] h-full border-r border-[#eaeaea] p-[20px] overflow-auto">
                {files.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('website_delivery.no_files')} />
                ) : (
                  <div className="flex flex-col gap-[8px]">
                    <div>
                      <div>
                        <Tree.DirectoryTree
                          switcherIcon={switcherIcon}
                          showIcon={false}
                          defaultExpandedKeys={defaultExpandedKeys}
                          treeData={antdTreeData}
                          selectedKeys={selectedKey ? [selectedKey] : []}
                          onSelect={(_, info) => {
                            const node = info.node as unknown as { key?: React.Key; isLeaf?: boolean };
                            if (node?.isLeaf && node?.key != null) {
                              setSelectedKey(String(node.key));
                            }
                          }}
                          className="website-delivery-tree"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: breadcrumb bar + editor */}
              <div className="flex-1 h-full relative">
                <div className="bg-[#f6f6f8] px-[12px] py-[12px] border-b border-[#eaeaea]">
                  {selectedFile ? (
                    formatPathBreadcrumb(selectedFile.path)
                  ) : (
                    <p className="text-[#999] text-[14px]">-</p>
                  )}
                </div>

                <div className="w-full h-[calc(100%-48px)]">
                  {!selectedFile ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('website_delivery.no_file_selected')} />
                    </div>
                  ) : selectedFileIsText ? (
                    fileLoading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Spin />
                      </div>
                    ) : fileError ? (
                      <div className="w-full h-full p-4 text-[12px] text-[#666] whitespace-pre-wrap break-words">
                        {fileError}
                      </div>
                    ) : (
                      <Editor
                        value={fileText || ''}
                        language={getLanguageFromPath(selectedFile.path)}
                        theme="vs"
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 12,
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                        }}
                        width="100%"
                        height="100%"
                      />
                    )
                  ) : (
                    <FileReader
                      url={selectedFile.url}
                      filename={selectedFile.path}
                      contentType={selectedFile.content_type}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebsiteDeliveryDetailRenderer;
