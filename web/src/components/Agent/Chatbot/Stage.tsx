import React, { memo, useState } from 'react';
import { CheckCircleFilled, DownOutlined } from '@ant-design/icons';
import { SearchSvg, BrowserSvg, PhoneSvg, CreateFileSvg, CellSvg } from '@/assets/svg';
import { TaskStatus } from '@/types';

const mockData = {
  title: '制定详细的行程规划',
  status: 'pending',
  detail: [
    {
      title: '正在查询出差行程安排',
      type: 'search',
      operate: '正在搜索',
      content: '成都AI展会出差行程',
    },
    {
      title: '正在生成出差行程安排文档',
      type: 'create',
      operate: '正在创建文件',
      content: '成都AI展会出差行程安排.md',
    },
  ],
};

interface TaskProgressProps {
  info: {
    title: string;
    status: TaskStatus;
    detail: {
      title: string;
      type: 'search' | 'browser' | 'phone' | 'create' | 'execute' | 'cell';
      file: string;
    }[];
  };
}

const TaskProgress = memo(({ info }: TaskProgressProps) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const iconRender = (type: string) => {
    const iconMap: Record<string, JSX.Element> = {
      search: <SearchSvg />,
      browser: <BrowserSvg />,
      phone: <PhoneSvg />,
      create: <CreateFileSvg />,
      cell: <CellSvg />,
    };

    return iconMap[type] || null;
  };

  return (
    <div className="space-y-4">
      {/* 标题行 */}
      <div className="flex items-center gap-2 text-lg font-medium">
        <CheckCircleFilled style={{ color: mockData.status === 'pending' ? '#999' : '#00A108' }} />
        <span>{mockData.title}</span>
        <div
          className={`flex justify-center items-center transition-transform duration-300 h-full text-sm cursor-pointer ${
            isExpanded ? 'rotate-180 ' : ''
          }`}
          onClick={() => setIsExpanded((pre) => !pre)}
        >
          <DownOutlined />
        </div>
      </div>

      {/* 任务详情 */}
      {isExpanded &&
        mockData.detail.map((item, index) => (
          <div key={index} className="space-y-4 pl-6">
            <div className="text-gray-500">{item.title}</div>
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-full">
              {iconRender(item.type)}
              <span className="text-[#000]">{item.operate}</span>
              <span className="text-[#666]">{item.content}</span>
            </div>
          </div>
        ))}
    </div>
  );
});

export default TaskProgress;
