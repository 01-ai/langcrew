import { useState, useEffect, useMemo, useCallback } from 'react';
import { message } from 'antd';
import { E2BFile } from '@/types';
import { isDocumentFile, isImageFile } from '@/utils/fileHelpers';
import { useRequestClient } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';

type TabType = 'all' | 'docs' | 'images';

export const useFileData = (sessionId: string, open: boolean) => {
  const { t } = useTranslation();
  const requestClient = useRequestClient();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [allFiles, setAllFiles] = useState<E2BFile[]>([]);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await requestClient.session.getFiles(sessionId);
      setAllFiles(response.data.files || []);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      message.error(t('files.fetch.failed'));
    } finally {
      setLoading(false);
    }
  }, [requestClient, sessionId, t]);

  // Fetch files when modal opens
  useEffect(() => {
    if (open && sessionId) {
      fetchFiles();
    }
  }, [fetchFiles, open, sessionId]);

  // Filter files by active tab
  const filteredFiles = useMemo(() => {
    if (activeTab === 'all') return allFiles;
    if (activeTab === 'docs') return allFiles.filter((f) => isDocumentFile(f.filename));
    if (activeTab === 'images') return allFiles.filter((f) => isImageFile(f.filename));
    return allFiles;
  }, [activeTab, allFiles]);

  return {
    loading,
    allFiles,
    filteredFiles,
    activeTab,
    setActiveTab,
    fetchFiles,
  };
};

