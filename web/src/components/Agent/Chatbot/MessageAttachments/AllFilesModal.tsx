import React, { useState } from 'react';
import { Modal, Button, Checkbox, Spin, message, ConfigProvider } from 'antd';
import { CloseOutlined, VerticalAlignBottomOutlined, DownloadOutlined } from '@ant-design/icons';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { E2BFile } from '@/types';
import { downloadAttachment } from '@/utils/file';
import { useFileData } from './useFileData';
import { FileListItem } from './FileListItem';
import { FilePreviewModal } from './FilePreviewModal';
import { FileViewerBatchDownloadIcon } from '@/components/Infra/Icons';
import { useTranslation } from '@/hooks/useTranslation';
import { useAgentStore } from '@/store';

interface AllFilesModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

const AllFilesModal: React.FC<AllFilesModalProps> = ({ open, onClose, sessionId }) => {
  const { t } = useTranslation();
  const { fullscreenFilePreview, setFileViewerFile, setLastWorkspaceAction } = useAgentStore();

  // Data management
  const { loading, allFiles, filteredFiles, activeTab, setActiveTab } = useFileData(sessionId, open);

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Preview state
  const [previewFile, setPreviewFile] = useState<E2BFile | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Selection handlers
  const handleToggleSelect = (path: string) => {
    setSelectedFiles((prev) => (prev.includes(path) ? prev.filter((f) => f !== path) : [...prev, path]));
  };

  const handleSelectAll = (e: any) => {
    setSelectedFiles(e.target.checked ? filteredFiles.map((f) => f.path) : []);
  };

  const handlePreview = (file: E2BFile) => {
    if (fullscreenFilePreview) {
      setLastWorkspaceAction('user');
      setFileViewerFile(file, filteredFiles);
      handleClose();
      return;
    }
    setPreviewFile(file);
    setPreviewModalOpen(true);
  };

  const handleDownload = (file: E2BFile) => {
    downloadAttachment(file);
  };

  const handleClosePreviewModal = () => {
    setPreviewModalOpen(false);
    setPreviewFile(null);
  };

  const handleBatchDownload = async () => {
    const filesToDownload = allFiles.filter((f) => selectedFiles.includes(f.path));

    if (filesToDownload.length === 0) {
      return;
    }

    setIsDownloading(true);
    const hideLoading = message.loading(t('files.download.packing', { count: filesToDownload.length }), 0);

    try {
      const zip = new JSZip();
      let hasFailedFiles = false;

      // Download all files into a ZIP
      for (const file of filesToDownload) {
        try {
          const response = await fetch(file.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${file.filename}`);
          }
          const blob = await response.blob();
          zip.file(file.filename, blob);
        } catch (error) {
          console.error(`Failed to download ${file.filename}`, error);
          message.error(t('files.download.failed', { filename: file.filename }));
          hasFailedFiles = true;
        }
      }



      // Skip the success toast when any download failed
      if (hasFailedFiles) {
        hideLoading();
        message.error(t('files.batch.failed'));
        setIsDownloading(false);
        return;
      }

      // Build the ZIP
      const content = await zip.generateAsync({ type: 'blob' });

      // Use the current timestamp as the filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      saveAs(content, `files-${timestamp}.zip`);
      hideLoading();
      message.success(t('files.download.success', { count: filesToDownload.length }));
      handleClose();
    } catch (error) {
      hideLoading();
      console.error('Failed to pack downloads:', error);
      message.error(t('files.batch.failed'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    setIsSelectionMode(false);
    setSelectedFiles([]);
    onClose();
  };

  return (
    <ConfigProvider
      theme={{
        components: {
          Modal: {
            borderRadiusLG: 20,
          },
        },
      }}
    >
      <Modal
        // Hide the default close button; render it in the title instead
        closable={false}
        styles={{
          mask: {
            background: 'rgba(0,0,0,0.45)',
          },
          container: {
            padding: 0,
            height: 560,
            background: '#fff',
            borderRadius: 20,
          },
          header: {
            // Custom title width
            width: 420,
            marginLeft: 20,
            paddingTop: 16,
            paddingBottom: 16,
            marginBottom: 0,
            // Custom title text style
            fontSize: '18px',
            fontWeight: 'bold',
            borderBottom: '1px solid #E5E5E5',
          },
          footer: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingRight: 0,
            paddingTop: 12,
            paddingBottom: 20,
            marginRight: 20,
            background: '#fff',
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
          },
          body: {
            maxHeight: '380px',
            marginRight: 20,
            marginLeft: 20,
          },
        }}
        title={
          !isSelectionMode ? (
            <div className="flex items-center justify-between border-gray-200">
              {/* Title text */}
              <span
                className="text-gray-900 leading-none"
                style={{
                  // Custom title text style
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                {t('files.modal.title')}
              </span>

              {/* Actions */} 
              <div className="flex items-center gap-2">
                <Button
                  type="text"
                  size="small"
                  onClick={() => setIsSelectionMode(true)}
                  // Use flex gap instead of mr-6
                  // icon={<VerticalAlignBottomOutlined className="text-gray-500 text-xl" />}
                  icon={<FileViewerBatchDownloadIcon className="text-gray-400 w-5 h-5 text-lg" />}
                  className="hover:bg-gray-100 flex items-center justify-center"
                  disabled={loading || allFiles.length === 0}
                />
                <Button
                  type="text"
                  size="small"
                  onClick={handleClose}
                  icon={<CloseOutlined className="text-lg w-5 h-5" />}
                  className="hover:bg-gray-100 flex items-center justify-center"
                />
              </div>
            </div>
          ) : null
        }
        open={open}
        onCancel={handleClose}
        footer={null}
        width={460}
        centered
      >
        {/* Header: Selection mode or Tab mode */}
        {isSelectionMode ? (
          <div className="flex justify-between items-center py-4 border-b border-gray-200">
            <Checkbox
              indeterminate={selectedFiles.length > 0 && selectedFiles.length < filteredFiles.length}
              checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
              onChange={handleSelectAll}
              className="font-medium text-gray-600 text-[15px] square-checkbox"
            >
              {t('files.selectAll')}
            </Checkbox>
            <Button
              type="text"
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedFiles([]);
              }}
              className="text-[15px]"
            >
              {t('button.cancel')}
            </Button>
          </div>
        ) : (
          <div className="flex justify-left items-center mt-4 gap-2">
            {(['all', 'docs', 'images'] as const).map((tab) => {
              const tabKey = tab === 'all' ? 'files.all' : tab === 'docs' ? 'files.documents' : 'files.images';
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`min-w-12 h-8 rounded-2 px-3 py-2 rounded-md  !text-xs justify-center transition-colors border ${activeTab === tab
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                    }`}
                >
                  {t(tabKey)}
                </button>
              );
            })}
          </div>
        )}

        {/* File list */}
        <div className="flex flex-col overflow-y-auto pr-1 custom-scrollbar max-h-[440px] mt-1 ">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spin />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center text-gray-400 py-20">{t('files.none')}</div>
          ) : (
            <>
              {filteredFiles.map((file, index) => (
                <FileListItem
                  key={file.path}
                  file={file}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedFiles.includes(file.path)}
                  onToggleSelect={handleToggleSelect}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                />
              ))}
            </>
          )}
        </div>

        {/* Bottom action button */}
        {isSelectionMode && (
          <div className="flex justify-end absolute bottom-0 left-0 right-0 pb-5 pt-3 mr-5">
            <Button
              type="default"
              icon={<FileViewerBatchDownloadIcon className="text-lg" />}
              disabled={selectedFiles.length === 0 || isDownloading}
              onClick={handleBatchDownload}
              className="bg-[#f7f7f7] border border-[#D0D0D0] text-black min-w-[112px] h-[36px] rounded-[6px] shadow-sm"
            >
              {t('files.batch.download')}
            </Button>
          </div>
        )}

        {/* Custom styles */}

        {/* Preview Modal */}
        <FilePreviewModal file={previewFile} open={previewModalOpen} onClose={handleClosePreviewModal} />
      </Modal>
    </ConfigProvider>
  );
};

export default AllFilesModal;
