import React, { useMemo, useRef } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSize } from 'ahooks';

interface CSVViewerProps {
  content: string;
}

interface CSVData {
  [key: string]: string;
}

const CSVViewer: React.FC<CSVViewerProps> = ({ content }) => {
  const ref = useRef(null);
  const size = useSize(ref);

  const { data, columns } = useMemo(() => {
    if (!content) {
      return { data: [], columns: [] };
    }

    try {
      // 检测并处理BOM（字节顺序标记）
      let processedContent = content;
      if (content.charCodeAt(0) === 0xfeff) {
        // 移除UTF-8 BOM
        processedContent = content.slice(1);
      } else if (content.charCodeAt(0) === 0xfffe) {
        // 移除UTF-16 LE BOM
        processedContent = content.slice(1);
      }

      // 解析CSV内容
      const lines = processedContent.trim().split('\n');
      if (lines.length === 0) {
        return { data: [], columns: [] };
      }

      // 解析表头
      const headers = lines[0].split(',').map((header) => header.trim().replace(/^["']|["']$/g, ''));

      // 解析数据行
      const data: CSVData[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // 简单的CSV解析，处理引号内的逗号
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim()); // 添加最后一个值

        const row: CSVData = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }

      // 生成表格列配置
      const tableColumns: ColumnsType<CSVData> = headers.map((header) => ({
        title: header,
        dataIndex: header,
        key: header,
        ellipsis: true,
        render: (text: string) => (
          <div className="min-w-[120px] max-w-[300px] truncate" title={text}>
            {text}
          </div>
        ),
      }));

      return { data, columns: tableColumns };
    } catch (error) {
      console.error('CSV parsing error:', error);
      return { data: [], columns: [] };
    }
  }, [content]);

  return (
    <div className="w-full h-full overflow-auto" ref={ref}>
      <Table
        rowKey={(record) => Object.values(record).join('-')}
        columns={columns}
        dataSource={data}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        scroll={{ x: 'max-content', y: size?.height ? size.height - 100 : '100%' }}
        className="h-full"
        size="small"
        bordered
      />
    </div>
  );
};

export default CSVViewer;
