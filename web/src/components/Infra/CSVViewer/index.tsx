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
      // detect and process BOM (byte order mark)
      let processedContent = content;
      if (content.charCodeAt(0) === 0xfeff) {
        // remove UTF-8 BOM
        processedContent = content.slice(1);
      } else if (content.charCodeAt(0) === 0xfffe) {
        // remove UTF-16 LE BOM
        processedContent = content.slice(1);
      }

      // parse CSV content
      const lines = processedContent.trim().split('\n');
      if (lines.length === 0) {
        return { data: [], columns: [] };
      }

      // parse headers
      const headers = lines[0].split(',').map((header) => header.trim().replace(/^["']|["']$/g, ''));

      // parse data rows
      const data: CSVData[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // simple CSV parsing, handle commas inside quotes
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
        values.push(current.trim()); // add the last value

        const row: CSVData = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }

      // generate table column configuration
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
