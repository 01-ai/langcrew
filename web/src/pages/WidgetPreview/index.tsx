import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { defaultJson, templates } from './data';
import { Select } from 'antd';
import { WidgetRender } from '@/components/WidgetRender';

const WidgetPreview: React.FC = () => {
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(0);

  const [jsxString, setJsxString] = useState(templates[0]?.jsx);

  const [jsxDataString, setJsxDataString] = useState(JSON.stringify(templates[0]?.json, null, 2));

  const [jsonString, setJsonString] = useState(JSON.stringify(defaultJson, null, 2));

  const handleJsxEditorChange = (value: string | undefined) => {
    if (value) {
      setJsxString(value);
    }
  };

  const handleJsxDataEditorChange = (value: string | undefined) => {
    if (value) {
      setJsxDataString(value);
    }
  };

  const handleJsonEditorChange = (value: string | undefined) => {
    if (value) {
      setJsonString(value);
    }
  };

  const handleTemplateChange = (value: number) => {
    setSelectedTemplateIndex(value);
    const selectedTemplate = templates[value];
    if (selectedTemplate) {
      setJsxString(selectedTemplate.jsx);
      setJsxDataString(JSON.stringify(selectedTemplate.json, null, 2));
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Widget Preview</h1>
        <Select
          options={templates.map((template, index) => ({
            label: template.name,
            value: index,
          }))}
          onChange={handleTemplateChange}
          placeholder="Select a template"
          value={selectedTemplateIndex}
          className="w-64"
        />
      </div>

      {/* Top Section - JSX */}
      <div className="flex-1 flex flex-col gap-px min-h-0 bg-gray-200">
        <div className="flex-1 flex gap-px min-h-0 bg-gray-200">
          {/* JSX Editor Panel */}
          <div className="flex flex-col flex-1 bg-white min-w-0">
            <div className="px-4 py-3 text-xs font-semibold text-gray-600 bg-gray-50 border-b border-gray-200 uppercase tracking-wide">
              JSX Code
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                value={jsxString}
                onChange={handleJsxEditorChange}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            </div>
          </div>

          {/* JSX Data Panel */}
          <div className="flex flex-col flex-1 bg-white min-w-0">
            <div className="px-4 py-3 text-xs font-semibold text-gray-600 bg-gray-50 border-b border-gray-200 uppercase tracking-wide">
              JSX Data
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="plaintext"
                value={jsxDataString}
                onChange={handleJsxDataEditorChange}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            </div>
          </div>

          {/* JSX Preview Panel */}
          <div className="flex flex-col flex-1 bg-white min-w-0">
            <div className="px-4 py-3 text-xs font-semibold text-gray-600 bg-gray-50 border-b border-gray-200 uppercase tracking-wide">
              JSX Preview
            </div>
            <div className="flex-1 overflow-auto flex items-center flex-col p-4 bg-gray-50">
              <div>
                <WidgetRender jsx={jsxString} data={jsxDataString} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - JSON */}
      <div className="flex-1 flex flex-col gap-px min-h-0 bg-gray-200">
        <div className="flex-1 flex gap-px min-h-0 bg-gray-200">
          {/* JSON Editor Panel */}
          <div className="flex flex-col flex-1 bg-white min-w-0">
            <div className="px-4 py-3 text-xs font-semibold text-gray-600 bg-gray-50 border-b border-gray-200 uppercase tracking-wide">
              JSON Code
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="json"
                value={jsonString}
                onChange={handleJsonEditorChange}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            </div>
          </div>

          {/* JSON Preview Panel */}
          <div className="flex flex-col flex-1 bg-white min-w-0">
            <div className="px-4 py-3 text-xs font-semibold text-gray-600 bg-gray-50 border-b border-gray-200 uppercase tracking-wide">
              JSON Preview
            </div>
            <div className="flex-1 overflow-auto flex items-center flex-col p-4 bg-gray-50">
              <div>
                <WidgetRender json={jsonString} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetPreview;
