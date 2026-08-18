import React, { useMemo, useEffect, useState, useCallback, useDeferredValue } from 'react';
import { Modal, Input, Button, Empty, ConfigProvider } from 'antd';
import { SearchOutlined, UserOutlined, ClockCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { useTranslation } from '@/hooks/useTranslation';
import { useAgentStore } from '@/store';
import SelectedIcon from '@/assets/svg/tools/selected.svg?react';
import FileIcon from '@/assets/svg/tools/file.svg?react';
import DeleteIcon from '@/assets/svg/tools/delete.svg?react';
import classNames from 'classnames';

const KnowledgeBaseModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const { t } = useTranslation();

  const [filterType, setFilterType] = useState<'ALL' | 'PUBLIC' | 'PERSONAL'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const { senderKnowledgeBases, selectedSenderKnowledgeBases, setSelectedSenderKnowledgeBases } = useAgentStore();

  useEffect(() => {
    setSelectedRowKeys(selectedSenderKnowledgeBases.map((item) => item.knowledge_id));
  }, [selectedSenderKnowledgeBases]);

  const filteredItems = useMemo(() => {
    return senderKnowledgeBases.filter((item) => {
      const matchSearch = item.name?.toLowerCase().includes(searchText.toLowerCase());
      let matchType = true;
      if (filterType === 'PUBLIC') matchType = item.visible_range !== 1;
      if (filterType === 'PERSONAL') matchType = item.visible_range === 1;
      return matchSearch && matchType;
    });
  }, [senderKnowledgeBases, searchText, filterType]);

  const deferredItems = useDeferredValue(filteredItems);

  const handleSelect = (item: any) => {
    const id = item.knowledge_id;
    const isSelected = selectedRowKeys.includes(id);
    let newKeys;

    // Multi-select
    if (isSelected) {
      newKeys = selectedRowKeys.filter((k) => k !== id);
    } else {
      newKeys = [...selectedRowKeys, id];
    }
    setSelectedRowKeys(newKeys);
  };

  const handleOk = useCallback(() => {
    setSelectedSenderKnowledgeBases(senderKnowledgeBases.filter((item) => selectedRowKeys.includes(item.knowledge_id)));
    onClose();
  }, [onClose, setSelectedSenderKnowledgeBases, senderKnowledgeBases, selectedRowKeys]);

  const handleRemoveTag = (id: string) => {
    setSelectedRowKeys(selectedRowKeys.filter((k) => k !== id));
  };

  const selectedKnowledgeBases = useMemo(() => {
    return selectedRowKeys
      .map((id) => senderKnowledgeBases.find((item) => item.knowledge_id === id))
      .filter((item): item is any => item !== undefined);
  }, [selectedRowKeys, senderKnowledgeBases]);

  const renderCard = (item: any) => {
    const isSelected = selectedRowKeys.includes(item.knowledge_id);

    return (
      <div
        key={item.knowledge_id}
        onClick={() => handleSelect(item)}
        className={`
          relative p-3 mb-2 rounded-xl border transition-all cursor-pointer group
          ${isSelected
            ? 'border-[#F2F2F2] bg-[#F6F6F8]'
            : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
          }
        `}
      >
        {/* Compact title */}
        <div className="font-bold text-[15px] text-gray-900 mb-1 truncate pr-8">{item.name || '-'}</div>

        {/* Compact description */}
        <div className="text-gray-500 text-xs mb-2 line-clamp-2 min-h-[1.25rem]">
          {item.description || t('knowledge.no_desc')}
        </div>

        {/* Compact footer */}
        <div className="flex items-center text-xs text-gray-400 gap-3">
          <div className="flex items-center gap-1">
            <UserOutlined style={{ fontSize: '10px' }} />
            <span>{item.create_user || t('knowledge.unknown')}</span>
          </div>
          <div className="flex items-center gap-1">
            <ClockCircleOutlined style={{ fontSize: '10px' }} />
            <span>{item.create_time}</span>
          </div>
        </div>

        {/* Selected checkmark */}
        {isSelected && (
          <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
            <SelectedIcon className="w-6 h-6" />
          </div>
        )}
      </div>
    );
  };

  /**
   * Render filter
   */
  const renderFilters = () => {
    const filterOptions = [
      { key: 'ALL', label: t('knowledge.filter.all') },
      { key: 'PUBLIC', label: t('knowledge.filter.public') },
      { key: 'PERSONAL', label: t('knowledge.filter.personal') },
    ];
    return (
      <div className="flex justify-between items-center mt-4 ml-5">
        <div className="flex gap-2">
          {filterOptions.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key as any)}
              className={classNames(
                'min-w-12 h-8 leading-4 px-3 py-2 rounded-lg !text-xs justify-center transition-colors',
                {
                  'bg-black text-white outline -outline-offset-1 outline-black': filterType === tab.key,
                  'bg-white text-gray-600 outline -outline-offset-1 outline-gray-200 hover:bg-gray-50':
                    filterType !== tab.key,
                },
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Input
          placeholder={t('knowledge.placeholder.search')}
          suffix={<SearchOutlined className="!text-black text-[16px] leading-[16px]" />}
          className="!w-[180px] h-8 mr-5 rounded-lg border-gray-200 text-[12px] focus:!border-gray-200 focus:!border-none "
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </div>
    );
  };

  return (
    <ConfigProvider
      theme={{
        components: {
          Modal: {
            borderRadiusLG: 20,
            contentBg: '#ffffff', // Keep an opaque background so overflow does not show through
          },
        },
      }}
    >
      <Modal
        title={t('sender.knowledge-base')}
        styles={{
          container: {
            padding: 0,
            height: 560,
          },
          header: {
            // Custom title width
            width: 420,
            marginLeft: 20,
            marginBottom: 0,
            paddingTop: 16,
            paddingBottom: 16,
            height: 52,
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
            marginLeft: 20,
            background: '#fff',
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
          },
          body: {
            position: 'relative',
          },
        }}
        open
        width={460}
        centered
        rootClassName="[&_.ant-modal-content]:overflow-hidden"
        footer={
          <div>
            {selectedKnowledgeBases.length > 0 && (
              <div className="overflow-x-auto custom-scrollbar bg-white mb-3">
                <div className="flex gap-2.5" style={{ width: 'max-content' }}>
                  {selectedKnowledgeBases.map((item) => (
                    <div
                      key={item.knowledge_id}
                      className="inline-flex overflow-auto items-center gap-2 px-3 py-1.5 bg-[#F4F4F4] rounded text-sm transition-colors whitespace-nowrap"
                      style={{ padding: '4px 12px 4px 4px' }}
                    >
                      <FileIcon className="text-gray-400 w-[15px] h-[15px]" />
                      <span className="text-black text-sm leading-5">{item.name}</span>
                      <DeleteIcon
                        className="text-gray-400 hover:text-gray-600 cursor-pointer w-[15px] h-[15px] flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(item.knowledge_id);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button
                onClick={onClose}
                className="bg-[#F7F7F7] text-black border-[#D0D0D0] font-medium min-w-15 h-9 px-4 py-1.5 text-sm rounded-md"
              >
                {t('button.cancel')}
              </Button>
              <Button
                type="primary"
                className="bg-black hover:bg-gray-800 border-none min-w-15 h-9 px-4 py-1.5 text-sm rounded-md"
                onClick={handleOk}
              >
                {t('button.ok')}
              </Button>
            </div>
          </div>
        }
        closeIcon={<CloseOutlined className="text-sm text-black w-5 h-5" />}
        onCancel={onClose}
        classNames={{
          container: 'optimize-close-button-modal',
        }}
      >
        {renderFilters()}
        {/*
          Content list:
          1. Keep a white/transparent background
          2. Use max-height instead of a fixed height
          3. overflow-y-auto for scrolling
          4. pr-1 so the scrollbar does not cover the border
        */}
        <div
          className="mx-5 mt-4 overflow-y-auto custom-scrollbar relative"
          style={{
            minHeight: '200px',
            maxHeight: '380px',
          }}
        >
          {deferredItems.length > 0 ? (
            deferredItems.map(renderCard)
          ) : (
            <div className="h-full flex items-center justify-center">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('knowledge.no_data')} />
            </div>
          )}
        </div>
      </Modal>
    </ConfigProvider>
  );
};;
export default KnowledgeBaseModal;
