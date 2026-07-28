import AgentX from '@/AgentX';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { mcpTools, pluginTools, sandboxTools, senderKnowledgeBases, skillTools } from './mock';
import type { MCPToolItem, KnowledgeBaseItem } from '@/types';

const PagePreviewHeader: React.FC = () => {
  const params = useParams();
  const { agentId, sessionId } = params;

  // Simulation model data
  const mockModels = [
    {
      "id": "9f1e8d2c",
      "model_display_name": "Claude Haiku 4.5",
      "icon": "https://app.lingyiwanwu.com/boway-prod/static/claude.png",
      "is_default": 0,
      "ext": {
        "name": "Claude Haiku 4.5",
        "name_en": "haiku-4-5",
        "feature": "Speed",
        "feature_en": "Fastest",
        "desc": "The fastest, the fastest, the best, and the best./Extract/Simple process.",
        "desc_en": "Fastest and most cost-efficient solution for high-concurrency Q&A, extraction, and simple workflows."
      }
    },
    {
      "id": "7a3e8b2f",
      "model_display_name": "Claude Sonnet 4",
      "icon": "https://app.lingyiwanwu.com/boway-prod/static/claude.png",
      "is_default": 1,
      "ext": {
        "name": "Claude Sonnet 4",
        "name_en": "sonnet-4",
        "feature": "Balance",
        "feature_en": "Balance",
        "desc": "Performance balance, coding, summary, routine multistep tasks.",
        "desc_en": "Balanced performance for coding, summarization, and general multi-step tasks."
      }
    },
    {
      "id": "7f3a9c2d",
      "model_display_name": "Claude Sonnet 4.5",
      "icon": "https://app.lingyiwanwu.com/boway-prod/static/claude.png",
      "is_default": 0,
      "ext": {
        "name": "Claude Sonnet 4.5",
        "name_en": "sonnet-4-5",
        "feature": "Recommendations",
        "feature_en": "Recommended",
        "desc": "Anthropic Main push model, coded, complexAgentOrganization.",
        "desc_en": "Anthropic’s flagship model, well-suited for coding and complex agent orchestration."
      }
    },
    {
      "id": "2d8e4b6a",
      "model_display_name": "DeepSeek-V3.2",
      "icon": "https://app.lingyiwanwu.com/boway-prod/static/deepseek.png",
      "is_default": 0,
      "ext": {
        "name": "DeepSeek-V3.2",
        "name_en": "deepseek-v3.2",
        "feature": "Inference first.",
        "feature_en": "Reasoning-first",
        "desc": "The reasoning capacity has been strengthened and is suitable for multi-step decision-making.",
        "desc_en": "Enhanced reasoning capabilities, suitable for multi-step decision-making."
      }
    },
    {
      "id": "a3f5b2c1",
      "model_display_name": "DeepSeek-V3.1",
      "icon": "https://app.lingyiwanwu.com/boway-prod/static/deepseek.png",
      "is_default": 0,
      "ext": {
        "name": "DeepSeek-V3.1",
        "name_en": "deepseek-v3-1-250821",
        "feature": "Mixed reasoning",
        "feature_en": "Hybrid reasoning",
        "desc": "The reasoning is balanced with the tool ' s call, and it is suitable for a multistage tool.",
        "desc_en": "Balanced reasoning and tool usage, suitable for multi-stage tool invocation."
      }
    },
    {
      "id": "2b4c6a8d",
      "model_display_name": "GPT-4.1",
      "icon": "https://app.lingyiwanwu.com/boway-prod/static/openai.png",
      "is_default": 0,
      "ext": {
        "name": "GPT-4.1",
        "name_en": "gpt-4.1",
        "feature": "Context",
        "feature_en": "Long context",
        "desc": "The context,1M Context, low delay, suitable for long document processing.",
        "desc_en": "Long context support with up to 1M tokens, low latency, ideal for long document processing."
      }
    },
    {
      "id": "a4f5b2c2",
      "model_display_name": "GPT-5",
      "icon": "https://app.lingyiwanwu.com/boway-prod/static/openai.png",
      "is_default": 0,
      "ext": {
        "name": "GPT-5",
        "name_en": "gpt-5",
        "feature": "Flagship reasoning",
        "feature_en": "Flagship Reasoning",
        "desc": "GPTFlagship models, which enhance coding, reasoning and long-link tools.",
        "desc_en": "The flagship GPT model enhances coding, reasoning, and long-chain tool invocation capabilities."
      }
    },
    {
      "id": "88e4d582",
      "model_display_name": "GPT-5.2",
      "icon": "https://app.lingyiwanwu.com/boway-prod/static/openai.png",
      "is_default": 0,
      "ext": {
        "name": "GPT-5.2",
        "name_en": "gpt-5.2",
        "feature": "The latest flagship.",
        "feature_en": "Latest flagship",
        "desc": "GPTThe latest flagship, the universal intelligence, tools and visual capability are being fully enhanced.",
        "desc_en": "The latest flagship GPT model, with comprehensive enhancements in general intelligence, tools, and vision capabilities."
      }
    },
    {
      "id": "7e1d3a5c",
      "model_display_name": "Gemini 3 Pro",
      "icon": "https://app.lingyiwanwu.com/boway-prod/static/gemini.png",
      "is_default": 0,
      "ext": {
        "name": "Gemini 3 Pro",
        "name_en": "gemini-3-pro-preview",
        "feature": "Front-end programming",
        "feature_en": "Frontend development",
        "desc": "Google The strongest generic model, the primary reasoning, the super-long context, and the front-end coding are particularly good.",
        "desc_en": "Google’s most powerful general-purpose model, focused on reasoning and ultra-long context, especially strong at frontend coding."
      }
    }
  ]
  // const mockModels = [];

  // Direct UseAgentXComponent, consistent with actual project
  return (
    <div>
      <AgentX
        basePath="/page-preview-header"
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
        ]}
        models={mockModels}
        selectedModels={undefined} // Model selection is optional, with default models at the back end
        backButtonNode={<Link to="/">Home</Link>}
        showSenderActions={true}
        previewScreen={{
          agentIcon: 'https://www.figma.com/api/mcp/asset/a889ff77-c76f-4f12-806e-2d7b7259e9d4',
          agentName: 'Advertising planner.',
          agentCreator: 'Tiger!',
          agentDescription: 'Auto-generated high quality with complete structure and clear content by title, summary and data-driven events PPT',
          prompts: [
            'Help me design an ad for a new product launch.',
            'Draft an initial relocation proposal for Beijing 01.AI that includes: 1. recommended plots in our industrial parks; 2. relevant land, tax, and talent policies in Shanghai.',
            'Designing a marketing strategy for my electric store.',
          ],
          useCases: [
            {
              title: 'Life insurance advice and insurance',
              description: 'This case shows one.40A female client of age has a complete consultation and insurance process for her husband \' s life insurance.',
              url: 'https://...',
            },
            {
              title: 'The accident and the life insurance.',
              description: 'Zhang San, the insured, died in an accident.,Its beneficiaries issue claims for settlement.',
              url: 'https://...',
            },
            {
              title: 'Health insurance counselling and insurance',
              description: 'This case shows one.35Detailed consultation and insurance process for male clients of age to allocate health insurance for themselves and their families',
              url: 'https://...',
            },
          ],
        }}
        headerNode={({ ChatTitle, ChatFiles }) => {
          console.log('ChatTitle', ChatTitle);
          return (
            <div className="flex items-center justify-between">
              <div></div>
              <div>{<ChatTitle />}</div>
              <div>{<ChatFiles />}</div>
            </div>
          );
        }}
      />
    </div>
  );
};

export default PagePreviewHeader;
