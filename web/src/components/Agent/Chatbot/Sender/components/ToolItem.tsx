import { KnowledgeBaseItem, SandboxToolItem, MCPToolItem } from '@/types';
import React from 'react';
import { getToolName } from './MCPToolModal';

// 类型判断函数
export const isKnowledgeBaseItem = (item: any): item is KnowledgeBaseItem => {
  return item && typeof item === 'object' && 'knowledge_id' in item;
};

export const isSandboxToolItem = (item: any): item is SandboxToolItem => {
  return item && typeof item === 'object' && 'agent_tool_id' in item && 'status' in item;
};

export const isMCPToolItem = (item: any): item is MCPToolItem => {
  return item && typeof item === 'object' && 'id' in item && !('agent_tool_id' in item);
};

const ToolItem: React.FC<{ item: any; index: number }> = ({ item, index }) => {
  // 根据类型获取不同的属性
  let icon: string | undefined;
  let name: string;

  if (isKnowledgeBaseItem(item)) {
    // 知识库项目
    icon = undefined; // 知识库项目通常没有图标
    name = item.name;
  } else if (isSandboxToolItem(item)) {
    // 沙箱工具项目
    icon = item.avatar;
    name = getToolName(item);
  } else if (isMCPToolItem(item)) {
    // MCP工具项目
    icon = item.icon;
    name = getToolName(item);
  } else {
    // 默认处理
    icon = item?.icon || item?.avatar;
    name = getToolName(item);
  }

  return (
    <div key={index} className="flex items-center w-[120px]">
      {icon && (
        <div className="w-[16px] mr-[4px] shrink-0">
          <img
            className="h-[16px] w-[16px] rounded-[3px] border border-[rgba(82,100,154,0.03)]"
            src={icon}
            alt={name}
          />
        </div>
      )}
      <div className="flex-1 text-[14px] line-clamp-1" title={name}>
        {name}
      </div>
    </div>
  );
};

export default ToolItem;
