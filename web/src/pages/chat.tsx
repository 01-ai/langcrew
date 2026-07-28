import AgentX from '@/AgentX';
import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { mcpTools, pluginTools, sandboxTools, senderKnowledgeBases, skillTools } from './mock';
import type { MCPToolItem, KnowledgeBaseItem, ModelItem } from '@/types';
import { Button } from 'antd';
import { getCommonRequestHeaders } from '@/services/request';

const getProviderModelsFromResponse = (response: any): ModelItem[] => {
  if (Array.isArray(response)) {
    return response;
  }

  const data = response?.data;
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.models)) {
    return data.models;
  }

  if (Array.isArray(data?.list)) {
    return data.list;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
};

const ChatPage: React.FC = () => {
  const params = useParams();
  const { agentId, sessionId } = params;
  const navigate = useNavigate();
  const [models, setModels] = React.useState<ModelItem[]>([]);

  React.useEffect(() => {
    const abortController = new AbortController();

    const fetchModels = async () => {
      try {
        const response = await fetch('/app/api/v1/provider-models/list?usage_scene=general', {
          signal: abortController.signal,
          headers: getCommonRequestHeaders({
            accept: 'text/event-stream',
            'Content-Type': 'application/json',
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch provider models: ${response.status}`);
        }

        const data = await response.json();
        setModels(getProviderModelsFromResponse(data));
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch provider models:', error);
      }
    };

    fetchModels();

    return () => {
      abortController.abort();
    };
  }, []);

  const testSessions = [
    {
      session_id: '486f8e451d644626',
      name: 'Multiple files',
    },
    {
      session_id: 'dfa9726cbcdc4206',
      name: 'Picture',
    },
    {
      session_id: '16c54a6aa8314cf8',
      name: 'Big document',
    },
    {
      session_id: '41c78d170bf84363',
      name: 'Video',
    },
    {
      session_id: '7fc12d236924423a',
      name: 'Painter',
    },
    {
      session_id: 'fcedea97aef843cf',
      name: 'Cloud cell phone.',
    },
    {
      session_id: 'f4b3186e8e294cdd',
      name: 'html href',
    },
  ];

  // Direct UseAgentXComponent, consistent with actual project
  return (
    <div className="w-screen h-screen">
      <AgentX
        basePath="/chat"
        agentId={agentId || '01'}
        sessionId={sessionId}
        knowledgeBases={senderKnowledgeBases as unknown as KnowledgeBaseItem[]}
        selectedKnowledgeBases={['9ceee0ec']}
        mcpTools={mcpTools as unknown as MCPToolItem[]}
        sandboxTools={sandboxTools as unknown as MCPToolItem[]}
        skillTools={skillTools as unknown as MCPToolItem[]}
        pluginTools={pluginTools as unknown as MCPToolItem[]}
        selectedTools={[
          'gaode_map',
          'fetch_mcp',
          'seekerliu/bocha/bocha',
          'langgenius/wikipedia/wikipedia',
          'code_interceptor',
          'browser',
          'document_skills_pptx',
          'document_skills_docx',
          'phone_rpa_tool',
        ]}
        models={models}
        selectedModels={undefined} // Model selection is optional, with default models at the back end
        backButtonNode={<Link to="/">Home</Link>}
        showSenderActions={true}
        senderOptions={[
          {
            type: 'select',
            label: 'something',
            field: 'something',
            defaultValue: 'option 1',
            placeholder: 'select something',
            options: [
              { label: 'option 1', value: 'option 1' },
              { label: 'option 2', value: 'option 2' },
            ],
          },
        ]}
        menuItems={['deep_research', 'create_image', 'create_video']}
        headerNode={({ ChatFiles }) => {
          return (
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <Button
                  type="primary"
                  onClick={() => {
                    navigate('/');
                  }}
                >
                  Home
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    navigate('/demos');
                  }}
                >
                  Demos
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    navigate(-1);
                  }}
                >
                  Back
                </Button>
                {testSessions.map((session) => (
                  <Button
                    key={session.session_id}
                    onClick={() => {
                      navigate(`/chat/01/${session.session_id}`);
                    }}
                  >
                    {session.name}
                  </Button>
                ))}
              </div>
              <div>{<ChatFiles />}</div>
            </div>
          );
        }}
      />
    </div>
  );
};

export default ChatPage;
