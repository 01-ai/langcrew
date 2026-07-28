import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Tabs, Tooltip } from 'antd';
import { getLanguage, getTranslation, useTranslation } from '@/hooks/useTranslation';
import { useAgentStore } from '@/store';
import checkedImg from '@/assets/svg/sender/checked.svg';
import { MCPToolItem, SandboxToolItem } from '@/types';
import MCPConfigModal from './MCPConfigModal';

const getLinkedText = (text: string) => {
  if (!text) return '';
  return text.replace(/(https?:\/\/[^\s]+)/g, (url) => {
    return `<a href="${url}" target="_blank">${url}</a>`;
  });
};

export const getToolName = (item: MCPToolItem | SandboxToolItem) => {
  const lang = getLanguage();
  if ((item as MCPToolItem).ext?.name_en || (item as SandboxToolItem).tool_name_en) {
    if ((item as MCPToolItem).ext?.[`name_${lang}`] || (item as SandboxToolItem)[`tool_name_${lang}`]) {
      return (item as MCPToolItem).ext?.[`name_${lang}`] || (item as SandboxToolItem)[`tool_name_${lang}`];
    }
    if (lang === 'zh') {
      return (item as MCPToolItem).name || (item as SandboxToolItem).tool_name;
    }
    return (item as MCPToolItem).ext?.name_en || (item as SandboxToolItem).tool_name_en;
  }
  return (item as MCPToolItem).name || (item as SandboxToolItem).tool_name;

};

const getDesc = (item: MCPToolItem | SandboxToolItem) => {
  const lang = getLanguage();
  if ((item as MCPToolItem).ext?.desc_en || (item as SandboxToolItem).desc_en) {
    if ((item as MCPToolItem).ext?.[`desc_${lang}`] || (item as SandboxToolItem)[`desc_${lang}`]) {
      return (item as MCPToolItem).ext?.[`desc_${lang}`] || (item as SandboxToolItem)[`desc_${lang}`];
    }
    if (lang === 'zh') {
      return (item as MCPToolItem).brief_introduction || (item as SandboxToolItem).desc;
    }
    return (item as MCPToolItem).ext?.desc_en || (item as SandboxToolItem).desc_en;
  }
  return (item as MCPToolItem).brief_introduction || (item as SandboxToolItem).desc;
};

const MCPToolModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('sandbox');
  const [displayMCPItems, setDisplayMCPItems] = useState<any[]>([]);
  const [displaySandboxItems, setDisplaySandboxItems] = useState<any[]>([]);
  const [displayBuiltinItems, setDisplayBuiltinItems] = useState<any[]>([]);
  const [displayWorkflowItems, setDisplayWorkflowItems] = useState<any[]>([]);
  const [displaySkillItems, setDisplaySkillItems] = useState<any[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([]);
  const [currentMcp, setCurrentMcp] = useState<any>(null);

  const {
    senderMCPTools,
    senderSandboxTools,
    senderPluginTools,
    senderWorkflowTools,
    senderSkillTools,
    selectedSenderMCPTools,
    setSelectedSenderMCPTools,
  } = useAgentStore();

  const tabItems = [
    {
      key: 'mcp',
      label: getTranslation('tool.tab.mcp'),
    },
    {
      key: 'sandbox',
      label: getTranslation('tool.tab.sandbox'),
    },
    ...(senderPluginTools?.length > 0 ? [{ key: 'plugins', label: getTranslation('tool.tab.plugins') }] : []),
    ...(senderWorkflowTools?.length > 0 ? [{ key: 'workflow', label: getTranslation('tool.tab.workflow') }] : []),
    ...(senderSkillTools?.length > 0 ? [{ key: 'skills', label: getTranslation('tool.tab.skills') }] : []),
    // {
    //   key: 'ai-app',
    //   label: getTranslation('tool.tab.ai-app'),
    //   disabled: true,
    // },
  ];

  const handleSelectedItemChange = useCallback(
    (ele: any) => {
      const id = ele.agent_tool_id;

      // Select not supported for the time being COMING and INACTIVE State tool, INACTIVEThe government has not yet secured the mobile phone.COMINGFor an imminent state of uplink
      if (['COMING', 'INACTIVE'].includes(ele?.status)) {
        return;
      }

      if (selectedKeys.includes(id)) {
        setSelectedKeys(selectedKeys.filter((key) => key !== id));
        return;
      }

      // For the time being, I'm not limited. MCP Number of services
      // if (selectedKeys.length === 3) {
      //   return;
      // }

      if (ele?.need_config) {
        setCurrentMcp(ele);
      } else {
        setSelectedKeys([...selectedKeys, id]);
      }
    },
    [selectedKeys],
  );

  const handleOk = useCallback(() => {
    const selectedMCPTools = senderMCPTools.filter((item) => selectedKeys.includes(item.agent_tool_id));
    const selectedSandboxTools = senderSandboxTools.filter((item) => selectedKeys.includes(item.agent_tool_id));
    const selectedPluginTools = senderPluginTools.filter((item) => selectedKeys.includes(item.agent_tool_id));
    const selectedWorkflowTools = senderWorkflowTools.filter((item) => selectedKeys.includes(item.agent_tool_id));
    const selectedSkillTools = senderSkillTools.filter((item) => selectedKeys.includes(item.agent_tool_id));

    setSelectedSenderMCPTools([
      ...selectedMCPTools,
      ...selectedSandboxTools,
      ...selectedPluginTools,
      ...selectedWorkflowTools,
      ...selectedSkillTools,
    ]);
    onClose();
  }, [
    onClose,
    setSelectedSenderMCPTools,
    senderMCPTools,
    senderSandboxTools,
    senderPluginTools,
    senderWorkflowTools,
    senderSkillTools,
    selectedKeys,
  ]);

  useEffect(() => {
    setSelectedKeys(selectedSenderMCPTools.map((item) => item.agent_tool_id));
  }, [selectedSenderMCPTools]);

  useEffect(() => {
    setDisplayMCPItems(senderMCPTools);
  }, [senderMCPTools]);

  useEffect(() => {
    setDisplaySandboxItems(senderSandboxTools);
  }, [senderSandboxTools]);

  useEffect(() => {
    setDisplayBuiltinItems(senderPluginTools);
  }, [senderPluginTools]);

  useEffect(() => {
    setDisplayWorkflowItems(senderWorkflowTools);
  }, [senderWorkflowTools]);

  useEffect(() => {
    setDisplaySkillItems(senderSkillTools);
  }, [senderSkillTools]);

  const onChange = (key: string) => {
    setActiveTab(key);
  };

  const contentRender = (type: string) => {
    const displayMap: any = { plugins: displayBuiltinItems, workflow: displayWorkflowItems, skills: displaySkillItems };
    const displayItems = displayMap[type] || [];

    if (!displayItems?.length) return null;

    return (
      <>
        {displayItems.map((item) => (
          <div
            key={item.agent_tool_id}
            className={`flex hover:pt-[13px] hover:pr-[12px] hover:pb-[13px] hover:pl-[17px] rounded-[8px] border hover:border-2 hover:border-[#5b8bff] cursor-pointer ${
              selectedKeys.includes(item.agent_tool_id)
                ? 'pt-[13px] pr-[12px] pb-[13px] pl-[17px] border-2 border-[#5b8bff] bg-[#ecf0fd]'
                : 'pt-[14px] pr-[13px] pb-[14px] pl-[18px] border-[#dadada] bg-white'
            }`}
            onClick={() => handleSelectedItemChange(item)}
          >
            <div className="flex justify-center items-center w-[42px] h-[42px] mr-[18px] rounded-[8px] overflow-hidden">
              <img src={item.icon} className="w-full" />
            </div>
            <div className="flex-1 flex flex-col justify-center gap-[2px]">
              <div className="text-[#000] text-[18px] not-italic font-bold leading-[22px]">{getToolName(item)}</div>
              <div className="text-[#000] text-[14px] not-italic font-normal leading-[16px] opacity-50 line-clamp-2">
                <Tooltip title={<div dangerouslySetInnerHTML={{ __html: getLinkedText(getDesc(item)) }}></div>}>
                  <span>{getDesc(item)}</span>
                </Tooltip>
              </div>
            </div>
            <div
              className={`flex justify-center items-center w-[20px] ml-[2px] ${
                selectedKeys.includes(item.agent_tool_id) ? 'flex' : 'hidden'
              }`}
            >
              <img src={checkedImg} />
            </div>
          </div>
        ))}
      </>
    );
  };

  return (
    <>
      <Modal
        // title={`${t('sender.mcp.add')}(${selectedKeys.length}/3)`}
        title={<Tabs activeKey={activeTab} items={tabItems} onChange={onChange} />}
        width={730}
        open
        className="agentx-mcp"
        cancelText={t('button.cancel')}
        okText={t('button.ok')}
        onOk={handleOk}
        onCancel={onClose}
      >
        <div className="flex flex-col gap-[12px] min-h-[260px] max-h-[660px] pt-[12px] pb-[8px] overflow-y-auto">
          {activeTab === 'mcp' &&
            displayMCPItems?.length > 0 &&
            displayMCPItems.map((item) => (
              <div
                key={item.agent_tool_id}
                className={`flex hover:pt-[13px] hover:pr-[12px] hover:pb-[13px] hover:pl-[17px] rounded-[8px] border hover:border-2 hover:border-[#5b8bff] cursor-pointer ${
                  selectedKeys.includes(item.agent_tool_id)
                    ? 'pt-[13px] pr-[12px] pb-[13px] pl-[17px] border-2 border-[#5b8bff] bg-[#ecf0fd]'
                    : 'pt-[14px] pr-[13px] pb-[14px] pl-[18px] border-[#dadada] bg-white'
                }`}
                onClick={() => handleSelectedItemChange(item)}
              >
                <div className="flex justify-center items-center w-[42px] h-[42px] mr-[18px] rounded-[8px] overflow-hidden">
                  <img src={item.icon} className="w-full" />
                </div>
                <div className="flex-1 flex flex-col justify-center gap-[2px]">
                  <div className="text-[#000] text-[18px] not-italic font-bold leading-[22px]">{getToolName(item)}</div>
                  <div className="text-[#000] text-[14px] not-italic font-normal leading-[16px] opacity-50 line-clamp-2">
                    <Tooltip title={<div dangerouslySetInnerHTML={{ __html: getLinkedText(getDesc(item)) }}></div>}>
                      <span>{getDesc(item)}</span>
                    </Tooltip>
                  </div>
                </div>
                <div
                  className={`flex justify-center items-center w-[20px] ml-[2px] ${
                    selectedKeys.includes(item.agent_tool_id) ? 'flex' : 'hidden'
                  }`}
                >
                  <img src={checkedImg} />
                </div>
              </div>
            ))}
          {activeTab === 'sandbox' &&
            displaySandboxItems?.length > 0 &&
            displaySandboxItems.map((item, index) => (
              <div
                key={index}
                className={`relative flex rounded-[8px] border ${
                  selectedKeys.includes(item.agent_tool_id)
                    ? 'pt-[13px] pr-[12px] pb-[13px] pl-[17px] border-2 border-[#5b8bff] bg-[#ecf0fd]'
                    : 'pt-[14px] pr-[13px] pb-[14px] pl-[18px] border-[#dadada] bg-white'
                } ${
                  ['COMING', 'INACTIVE'].includes(item.status)
                    ? 'cursor-not-allowed opacity-50 grayscale'
                    : 'cursor-pointer hover:pt-[13px] hover:pr-[12px] hover:pb-[13px] hover:pl-[17px] hover:border-2 hover:border-[#5b8bff]'
                }`}
                onClick={() => handleSelectedItemChange(item)}
              >
                <div className="flex justify-center items-center w-[42px] h-[42px] mr-[18px] rounded-[8px] overflow-hidden">
                  <img src={item.icon} className="w-full" />
                </div>
                <div className="flex-1 flex flex-col justify-center gap-[2px]">
                  <div className="text-[#000] text-[18px] not-italic font-bold leading-[22px]">{getToolName(item)}</div>
                  <div className="text-[#000] text-[14px] not-italic font-normal leading-[16px] opacity-50 line-clamp-2">
                    <span>{getDesc(item)}</span>
                  </div>
                </div>
                <div
                  className={`flex justify-center items-center w-[20px] ml-[2px] ${
                    selectedKeys.includes(item.agent_tool_id) ? 'flex' : 'hidden'
                  }`}
                >
                  <img src={checkedImg} />
                </div>
                {item.status === 'COMING' && (
                  <div className="absolute top-[14px] right-[13px]">{getTranslation('mcp.tool.coming')}</div>
                )}
              </div>
            ))}
          {activeTab === 'plugins' && contentRender('plugins')}
          {activeTab === 'workflow' && contentRender('workflow')}
          {activeTab === 'skills' && contentRender('skills')}
        </div>
      </Modal>
      {currentMcp && (
        <MCPConfigModal
          currentMcp={currentMcp}
          onChange={(item: MCPToolItem) => {
            if (item) {
              setSelectedKeys([...selectedKeys, item.agent_tool_id]);
              setDisplayMCPItems((pre) => pre.map((preItem) => (preItem.id === item.id ? item : preItem)));
            }
            setCurrentMcp(null);
          }}
        />
      )}
    </>
  );
};
export default MCPToolModal;
