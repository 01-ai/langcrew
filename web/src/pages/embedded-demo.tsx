import AgentX from '@/AgentX';
import { Button, Input } from 'antd';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const EmbeddedDemoPage: React.FC = () => {
  const [greeting, setGreeting] = useState('What can I do for you today?');
  const [prompts, setPrompts] = useState<string[]>([
    '🤖  What is AgentX?',
    '✨  Show me an example widget',
    '🎨  What can I customize?',
    '🔧  How do I use client side tools?',
    '🖥️  Server side tools',
  ]);

  const handleAddPrompt = () => {
    setPrompts([...prompts, '']);
  };

  const handleRemovePrompt = (index: number) => {
    const newPrompts = prompts.filter((_, i) => i !== index);
    setPrompts(newPrompts);
  };

  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Configuration Area */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Start screen Configure */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Start screen</h3>

            {/* Greeting Configure */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Greeting</label>
              <TextArea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="What can I help with today?"
                rows={3}
                className="w-full"
              />
            </div>

            {/* Starter prompts Configure */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Starter prompts</label>
                <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleAddPrompt}>

                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {prompts.map((prompt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={prompt}
                      onChange={(e) => handlePromptChange(index, e.target.value)}
                      placeholder={`Prompt ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemovePrompt(index)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Code example. */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Example code</h3>
            <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto text-gray-800">
              {`<AgentX
  displayMode="embedded"
  startScreen={{
    greeting: '${greeting}',
    prompts: [
${prompts.map((p) => `      '${p}',`).join('\n')}
    ],
  }}
  agentId="01"
/>`}
            </pre>
          </div>
        </div>
      </div>

      {/* Preview area on the right. */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl h-full">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full">
            <AgentX
              agentId="01"
              displayMode="embedded"
              startScreen={{ greeting, prompts }}
              placeholder="I'll answer any questions about the mind."
            />
          </div>
        </div>
      </div>
    </div>

  );
};

export default EmbeddedDemoPage;
