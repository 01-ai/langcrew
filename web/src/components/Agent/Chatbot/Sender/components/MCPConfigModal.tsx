import React, { useEffect, useState } from 'react';
import { Form, Input, Modal, message, Tooltip } from 'antd';
import { getLanguage, useTranslation } from '@/hooks/useTranslation';
import { MCPToolItem } from '@/types';
import { useRequestClient } from '@/store';
import leftIcon from '@/assets/svg/sender/mcp-config-left.svg';

const getLinkedText = (text: string) => {
  if (!text) return '';
  return text.replace(/(https?:\/\/[^\s]+)/g, (url) => {
    return `<a href="${url}" target="_blank">${url}</a>`;
  });
};

const getMcpName = (item: any) => {
  const lang = getLanguage();
  // It says it's system data.
  if (item.ext?.name_en) {
    // Prefer to user-set languages
    if (item.ext?.[`name_${lang}`]) {
      return item.ext?.[`name_${lang}`];
    }
    // In Chinese, usename
    if (lang === 'zh') {
      return item.name;
    }
    // If no user language is available, use English as afallback
    return item.ext?.name_en;
  }
  // User created data
  return item.name;
};

const getMcpDesc = (item: any) => {
  const lang = getLanguage();
  // It says it's system data.
  if (item.ext?.desc_en) {
    if (item.ext?.[`desc_${lang}`]) {
      return item.ext?.[`desc_${lang}`];
    }
    if (lang === 'zh') {
      return item.details;
    }
    return item.ext?.desc_en;
  }
  // User created data
  return item.details;
};

interface mcpConfigModalProps {
  currentMcp: MCPToolItem | null;
  onChange: (item: MCPToolItem | null) => void;
}

const MCPConfigModal: React.FC<mcpConfigModalProps> = ({ currentMcp, onChange }) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const requestClient = useRequestClient();
  const [configLoading, setConfigLoading] = useState<boolean>(false);

  const handleConfigConfirm = async () => {
    try {
      const values = await form.validateFields();
      setConfigLoading(true);
      const configList = currentMcp?.config ?? [];
      const config = configList.reduce((acc, curItem) => {
        acc[curItem.param_name] = values[curItem.param_name];
        return acc;
      }, {});
      const id = currentMcp.agent_tool_id;
      await requestClient.mcp
        .edit({
          mcp_server_id: id,
          config,
        })
        .then(() => {
          onChange({
            ...currentMcp,
            config: configList.map((item) => ({ ...item, param_value: values[item.param_name] })),
          });
        })
        .catch((error) => {
          const data = error?.response?.data || {};
          if (data?.code === 7501) {
            message.error(data.message);
          }
        })
        .finally(() => setConfigLoading(false));
    } catch (error) {
      console.info(error);
    }
  };

  useEffect(() => {
    if (currentMcp) {
      if (currentMcp?.need_config) {
        form.resetFields();
        setConfigLoading(false);
        const configList = currentMcp?.config ?? [];
        configList.forEach((item) => {
          form.setFieldsValue({
            [item.param_name]: item.param_value,
          });
        });
      }
    }
  }, [currentMcp, form]);

  return (
    <Modal
      title={
        <>
          <div
            className="inline-flex justify-center items-center w-8 h-8 rounded-md cursor-pointer"
            onClick={() => onChange(null)}
          >
            <img src={leftIcon} alt="" />
          </div>
          <span>{t('mcp.config.modal.title')}</span>
        </>
      }
      width={730}
      open
      onCancel={() => onChange(null)}
      onOk={handleConfigConfirm}
      okButtonProps={{ loading: configLoading }}
    >
      <div>
        <div className="flex pt-6  px-0  pb-8">
          <div className="flex justify-center items-center w-11 h-11 mt-1  mr-4  mb-0  ml-0  rounded-lg overflow-hidden">
            <img src={currentMcp.icon} alt="" className="w-full" />
          </div>
          <div className="flex-1">
            <div className="text-[#000] text-lg not-italic font-bold leading-[1.38rem]">{getMcpName(currentMcp)}</div>
            <div className="text-[#000] text-sm not-italic font-normal leading-4 opacity-50 overflow-hidden text-ellipsis">
              <Tooltip title={<div dangerouslySetInnerHTML={{ __html: getLinkedText(getMcpDesc(currentMcp)) }}></div>}>
                <span>{getMcpDesc(currentMcp)}</span>
              </Tooltip>
            </div>
          </div>
        </div>
        <Form form={form} layout="vertical">
          {currentMcp?.config &&
            currentMcp?.config?.map((item) => (
              <Form.Item
                key={item.param_name}
                name={item.param_name}
                label={item.param_name}
                rules={[{ required: !item.is_optional }]}
              >
                <Input />
              </Form.Item>
            ))}
        </Form>
      </div>
    </Modal>
  );
};

export default MCPConfigModal;
