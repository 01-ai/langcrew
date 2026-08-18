import React, { useMemo, useRef } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSize } from 'ahooks';
import { getTranslation, useTranslation } from '@/hooks/useTranslation';

interface CSVViewerProps {
  content: string;
}

interface CSVData {
  [key: string]: string;
}

interface CSVValidationResult {
  isValid: boolean;
  error?: string;
}

// Validate CSV shape
const validateCSV = (content: string): CSVValidationResult => {
  if (!content || !content.trim()) {
    return { isValid: false, error: getTranslation('csv.error.empty') };
  }

  try {
    // Strip BOM if present
    let processedContent = content;
    if (content.charCodeAt(0) === 0xfeff) {
      processedContent = content.slice(1);
    } else if (content.charCodeAt(0) === 0xfffe) {
      processedContent = content.slice(1);
    }

    const lines = processedContent.trim().split('\n');

    // Require a header row
    if (lines.length < 1) {
      return { isValid: false, error: getTranslation('csv.error.missing_header') };
    }

    // Reject an empty header
    const headerLine = lines[0].trim();
    if (!headerLine) {
      return { isValid: false, error: getTranslation('csv.error.empty_header') };
    }

    // Count header columns
    const headers: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < headerLine.length; j++) {
      const char = headerLine[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        headers.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    headers.push(current.trim());

    const expectedColumnCount = headers.length;

    // Require at least one column
    if (expectedColumnCount === 0) {
      return { isValid: false, error: getTranslation('csv.error.zero_columns') };
    }

    // Require at least one valid data row
    let validDataRowCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Count columns in this row
      const values: string[] = [];
      let cellCurrent = '';
      let cellInQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          cellInQuotes = !cellInQuotes;
        } else if (char === ',' && !cellInQuotes) {
          values.push(cellCurrent.trim());
          cellCurrent = '';
        } else {
          cellCurrent += char;
        }
      }
      values.push(cellCurrent.trim());

      // Check column count
      if (values.length !== expectedColumnCount) {
        return {
          isValid: false,
          error: getTranslation('csv.error.column_mismatch', {
            row: i + 1,
            expected: expectedColumnCount,
            actual: values.length,
          }),
        };
      }

      validDataRowCount++;
    }

    // Require at least one data row besides the header
    if (validDataRowCount === 0) {
      return { isValid: false, error: getTranslation('csv.error.no_data') };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: getTranslation('csv.error.validation_failed', {
        message: error instanceof Error ? error.message : getTranslation('csv.error.unknown'),
      }),
    };
  }
};

const CSVViewer: React.FC<CSVViewerProps> = ({ content }) => {
  const ref = useRef(null);
  const size = useSize(ref);
  const { t } = useTranslation();

  const { data, columns, validationError } = useMemo(() => {
    // Return empty data while content is still loading
    // Avoid flashing a validation error while content is loading
    if (!content || !content.trim()) {
      return { data: [], columns: [], validationError: null };
    }

    // Validate CSV before parsing
    const validation = validateCSV(content);
    if (!validation.isValid) {
      console.warn('Invalid CSV:', validation.error);
      return { data: [], columns: [], validationError: validation.error };
    }

    try {
      // Strip a UTF BOM if present
      let processedContent = content;
      if (content.charCodeAt(0) === 0xfeff) {
        // Strip UTF-8 BOM
        processedContent = content.slice(1);
      } else if (content.charCodeAt(0) === 0xfffe) {
        // Strip UTF-16 LE BOM
        processedContent = content.slice(1);
      }

      // Parse CSV content
      const lines = processedContent.trim().split('\n');

      // Parse headers with the same cell splitter as data rows
      const headerLine = lines[0];
      const headers: string[] = [];
      let headerCurrent = '';
      let headerInQuotes = false;

      for (let j = 0; j < headerLine.length; j++) {
        const char = headerLine[j];
        if (char === '"') {
          headerInQuotes = !headerInQuotes;
        } else if (char === ',' && !headerInQuotes) {
          // headers.push(headerCurrent.trim().replace(/^["']|["']$/g, ''));
          // Fall back to Column_N when a header cell is empty
          const finalHeader = headerCurrent.trim().replace(/^["']|["']$/g, '');
          headers.push(finalHeader || `Column_${headers.length + 1}`);
          headerCurrent = '';
        } else {
          headerCurrent += char;
        }
      }
      const lastHeader = headerCurrent.trim().replace(/^["']|["']$/g, '');
      headers.push(lastHeader || `Column_${headers.length + 1}`);

      // Parse data rows
      const data: CSVData[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Parse CSV cells, including quoted commas
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
        values.push(current.trim()); // last cell

        const row: CSVData = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }

      // Build table columns
      const tableColumns: ColumnsType<CSVData> = headers.map((header) => ({
        title: header,
        dataIndex: header,
        key: header,
        ellipsis: true,
        render: (text: unknown) => (
          <div className="min-w-[120px] max-w-[300px] truncate" title={String(text ?? '')}>
            {String(text ?? '')}
          </div>
        ),
      }));

      return { data, columns: tableColumns, validationError: null };
    } catch (error) {
      console.error('CSV parsing error:', error);
      return {
        data: [],
        columns: [],
        validationError: error instanceof Error ? error.message : getTranslation('csv.error.unknown'),
      };
    }
  }, [content]);

  // Show a validation error when CSV parsing fails
  if (validationError) {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-auto" ref={ref}>
        <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 font-semibold text-lg mb-2">❌ {t('csv.format_error')}</div>
          <div className="text-red-500">{validationError}</div>
        </div>
      </div>
    );
  }

  // Empty state when there are no rows
  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-auto" ref={ref}>
        <div className="text-center p-8 text-gray-400">
          <div className="text-lg">{t('csv.no_data')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto" ref={ref}>
      <Table
        rowKey={(record) => Object.values(record).join('-')}
        columns={columns}
        dataSource={data}
        virtual
        pagination={false}
        scroll={{
          x: Math.max(columns.length * 160, size?.width ?? 0),
          y: size?.height ? size.height - 60 : 600,
        }}
        className="h-full"
        size="small"
        bordered
      />
    </div>
  );
};

export default CSVViewer;
