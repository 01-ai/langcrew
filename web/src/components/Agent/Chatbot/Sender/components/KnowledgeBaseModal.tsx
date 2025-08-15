import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Modal, Table } from 'antd';
import { useTranslation } from '@/hooks/useTranslation';
import { useAgentStore } from '@/store';

const KnowledgeBaseModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const { t } = useTranslation();

  const [displayItems, setDisplayItems] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const { senderKnowledgeBases, selectedSenderKnowledgeBases, setSelectedSenderKnowledgeBases } = useAgentStore();

  const columns: any = useMemo(
    () => [
      {
        title: t('sender.knowledge-base.table.name'),
        dataIndex: 'name',
        width: '50%',
      },
      {
        title: t('sender.knowledge-base.table.creation-time'),
        dataIndex: 'create_time',
        width: '50%',
      },
    ],
    [t],
  );

  const rowSelection = {
    onChange: (selectedRowKeys: string[]) => {
      setSelectedRowKeys(selectedRowKeys);
    },
  };

  const handleOk = useCallback(() => {
    setSelectedSenderKnowledgeBases(senderKnowledgeBases.filter((item) => selectedRowKeys.includes(item.knowledge_id)));
    onClose();
  }, [onClose, setSelectedSenderKnowledgeBases, senderKnowledgeBases, selectedRowKeys]);

  useEffect(() => {
    setSelectedRowKeys(selectedSenderKnowledgeBases.map((item) => item.knowledge_id));
  }, [selectedSenderKnowledgeBases]);

  useEffect(() => {
    setDisplayItems(senderKnowledgeBases);
  }, [senderKnowledgeBases]);

  return (
    <Modal
      title={t('sender.knowledge-base')}
      open
      cancelText={t('button.cancel')}
      okText={t('button.ok')}
      onOk={handleOk}
      onCancel={onClose}
    >
      <Table
        rowKey="knowledge_id"
        rowSelection={{ type: 'checkbox', ...rowSelection, selectedRowKeys: selectedRowKeys }}
        columns={columns}
        dataSource={displayItems}
        pagination={{ showSizeChanger: false }}
      />
    </Modal>
  );
};
export default KnowledgeBaseModal;
