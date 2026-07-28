import AgentX from '@/AgentX';
import { Button, Input, Switch, message } from 'antd';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { DeleteOutlined, PlusOutlined, RobotOutlined } from '@ant-design/icons';
import classNames from 'classnames';

const { TextArea } = Input;

const agentIcon = 'https://www.figma.com/api/mcp/asset/a889ff77-c76f-4f12-806e-2d7b7259e9d4';

const PreviewDemoPage: React.FC = () => {
  // Preview Screen Configure
  const [agentName, setAgentName] = useState('Advertising planner.');
  const [agentCreator, setAgentCreator] = useState('Tiger!');
  const [agentDescription, setAgentDescription] = useState(
    'Auto-generated high quality with complete structure and clear content by title, summary and data-driven events PPT',
  );
  const [prompts, setPrompts] = useState<string[]>([
    'Help me design an ad for a new product launch.',
    'Draft an initial relocation proposal for Beijing 01.AI that includes: 1. recommended plots in our industrial parks; 2. relevant land, tax, and talent policies in Shanghai.',
    'Designing a marketing strategy for my electric store.',
  ]);

  // Preview Config Configure
  const [rightPanelVisible, setRightPanelVisible] = useState(undefined);
  const [sendDisabled, setSendDisabled] = useState(true);
  const [formFilled, setFormFilled] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);
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

  const handleRightPanelVisibleChange = (visible: boolean, trigger: 'auto' | 'user' | 'tool') => {
    console.log(`[Preview Demo] Right panel ${visible ? 'opened' : 'closed'} by ${trigger}`);
    message.info(`Right Panel${visible ? 'Expand' : 'Put it away.'}（Trigger Source: ${trigger}）`);
    setRightPanelVisible(visible);
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Configuration area on the left. */}
      <div
        className={classNames(' bg-white border-r border-gray-200 overflow-y-auto', {
          'w-96': rightPanelVisible,
          'flex-1': !rightPanelVisible,
        })}
      >
        <div className="p-6 space-y-6">
          {/* Preview Screen configuration. */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Preview Screen</h3>

            {/* Agent name. */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Agent Name</label>
              <Input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Input Agent Name"
                prefix={<RobotOutlined />}
              />
            </div>

            {/* Agent creator. */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Agent Creator</label>
              <Input
                value={agentCreator}
                onChange={(e) => setAgentCreator(e.target.value)}
                placeholder="Enter the creator 's name"
              />
            </div>

            {/* Agent description. */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Agent Description</label>
              <TextArea
                value={agentDescription}
                onChange={(e) => setAgentDescription(e.target.value)}
                placeholder="Description Agent Functions and characteristics of the"
                rows={3}
              />
            </div>

            {/* Starter prompt configuration. */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Example questions</label>
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
                      placeholder={`Problem ${index + 1}`}
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

          {/* Preview configuration. */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Preview Config</h3>

            {/* Workspace controls. */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Zoom in.</span>
                <Switch checked={rightPanelVisible} onChange={setRightPanelVisible} />
              </div>

              {/* Simulated form workflow. */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Simulation forms filled in</span>
                <Switch
                  checked={formFilled}
                  onChange={(checked) => {
                    setFormFilled(checked);
                    setSendDisabled(!checked);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Disable Send button</span>
                <Switch checked={sendDisabled} onChange={setSendDisabled} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Disable Input Text</span>
                <Switch checked={inputDisabled} onChange={(checked) => setInputDisabled(checked)} />
              </div>
            </div>

            {!formFilled && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">

                💡 Hint: Simulation forms are not completed and sending buttons will be disabled
              </div>
            )}
          </div>

          {/* Code example. */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Example code</h3>
            <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto text-gray-800">
              {`<AgentX
  displayMode="preview"
  previewScreen={{
    agentIcon: '${agentIcon}',
    agentName: '${agentName}',
    agentCreator: '${agentCreator}',
    agentDescription: '${agentDescription}',
    prompts: [
${prompts.map((p) => `      '${p}',`).join('\n')}
    ],
  }}
  previewConfig={{
    rightPanelVisible: ${rightPanelVisible},
    onRightPanelVisibleChange: (visible, trigger) => {
      console.log(\`Right panel \${visible}\`);
    },
    sendDisabled: ${sendDisabled},
    sendDisabledTooltip: 'Please complete the form configuration',
    inputDisabled: ${inputDisabled},
  }}
  agentId="01"
/>`}
            </pre>
          </div>

          {/* Feature details. */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Functional description</h3>
            <div className="text-xs text-gray-600 space-y-2">
              <p>✅ Right working area layout (similar) Page mode)</p>
              <p>✅ Create Session Do not jump on pages after</p>
              <p>✅ The outer layer controls the workspace./Put it away.</p>
              <p>✅ Workspace change callback</p>
              <p>✅ Disables the controlled sending button</p>
              <p>✅ Fit to Form Configuration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview area on the right. */}
      <div className="flex-1 bg-gray-100">
        <AgentX
          agentId="01"
          displayMode="preview"
          previewScreen={{
            agentIcon,
            agentName,
            agentCreator,
            agentDescription,
            prompts,
            useCases: [
              {
                title: 'Tool List Test',
                description: 'User requested list of tools, assistant completed108Classification statistics and inventories of one tool are established.',
                url: 'https://test-app.lingyiwanwu.net/console/agent/share/p-3sjrUYGVZLJNOtIJEZUln0',
              },
              {
                title: '',
                description: 'The user asks how many tools, and the assistant will automatically test all the tools that are configured.',
                url: 'https://test-app.lingyiwanwu.net/console/agent/share/p-qOjhteNOo9RmcidAhZiCQ',
              },
              {
                title: '',
                description: 'The tool autotest assistant executes the test case3，Complete tool discovery and classification.',
                url: 'https://test-app.lingyiwanwu.net/console/agent/share/p-L6qILIUHwkSozd9Gs38uU',
              },
              {
                title: '',
                description: 'Tool Autotest Assistant performs functional validation tests.',
                url: 'https://test-app.lingyiwanwu.net/console/agent/share/p-4TNg6u91jNWPv904D6iw6j',
              },
              {
                title: '',
                description: 'The tool autotest assistant executes the test case1，Completed108Classification and validation of a tool.',
                url: 'https://test-app.lingyiwanwu.net/console/agent/share/p-2l6vjKPW27y4R0BM6NsG5J',
              },
              {
                title: '',
                description: 'User request test cases6，The assistant is prepared to perform automation tool testing.',
                url: 'https://test-app.lingyiwanwu.net/console/agent/share/p-6jScpbyJ8WZwI27IPs7hNb',
              },
              {
                title: '',
                description: 'User request test cases8，The assistant is prepared to perform automation tool testing.',
                url: 'https://test-app.lingyiwanwu.net/console/agent/share/p-3vh5U3Oc1EEtR7twqGUUjB',
              },
              {
                title: 'Cases8Query',
                description: 'User Query"Cases8"，The assistant searched the knowledge base without finding direct matches and returned the questions and answers and student information.',
                url: 'https://test-app.lingyiwanwu.net/console/agent/share/p-mOG5RaswmNgN8TBZA26vZ',
              },
              {
                title: 'Cases9Query Results',
                description: 'User queries9，The assistant returned the relevant learning methods and student information from the knowledge base.',
                url: 'https://test-app.lingyiwanwu.net/console/agent/share/p-2OjlA28beAjgwhVXqyj9Ca',
              },
              {
                title: '',
                description: 'User queries10，The assistant searches the knowledge base.',
                url: 'https://test-app.lingyiwanwu.net/console/agent/share/p-2Ajbad6E0ukhgVmzsVod0V',
              },
              {
                title: 'Cases11Query',
                description: 'User Query"Cases11"，The assistant searched the knowledge base and provided detailed information on Zhengxi.',
                url: 'https://test-app.lingyiwanwu.net/console/agent/share/p-PFuwOf86Nj1lvZXSjtESm',
              },
              {
                title: '',
                description: 'User queries12，The assistant searchs for information about the knowledge base.',
                url: 'https://test-app.lingyiwanwu.net/console/agent/share/p-rCtocbrNhDmWLcmi5QIcD',
              },
            ],
          }}
          previewConfig={{
            rightPanelVisible: rightPanelVisible,
            onRightPanelVisibleChange: handleRightPanelVisibleChange,
            sendDisabled,
            sendDisabledTooltip: formFilled ? undefined : 'Please finish. Agent Configure and send after',
            inputDisabled: inputDisabled,
          }}
          // headerNode={({ ChatTitle, ChatFiles }) => {
          //   return null;
          // }}
        />
      </div>
    </div>
  );
};

export default PreviewDemoPage;
