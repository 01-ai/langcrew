import { describe, it, expect } from 'vitest';
import { getLoadingMessage } from '../../utils';
import { transformChunksToMessages } from '../../transformChunksToMessages';
import { MessageChunk, MessageToolChunk } from '@/types';

const chunks = [
  {
    id: 72870,
    role: 'user',
    type: 'text',
    content:
      '详细解释一下智能体、Agent、大模型、LLM、MCP的概念解释与总结，智能体、Agent、大模型、LLM、MCP每一个都分别用一个版面来描述，最终用一个版面进行总体总结',
    detail: {},
    step_id: null,
    timestamp: 1760421811,
    is_llm_message: false,
    session_id: '6e9a138f04bc4ba0',
  },
  {
    id: 72891,
    role: 'assistant',
    type: 'text',
    content: '现在我开始创建PPT，共9页：封面页、智能体、Agent、大模型、LLM、MCP、总结页、致谢页。',
    detail: {
      run_id: 'baf4ad73-962c-4e9b-8694-a4cc3fa74a0d',
      full_content: '现在我开始创建PPT，共9页：封面页、智能体、Agent、大模型、LLM、MCP、总结页、致谢页。',
      tool_calls: [
        {
          name: 'make_new_slide_from_template',
          args: {
            template_page_index: 1,
            page_index: 1,
            replace_content:
              '{\n  "text": {\n    "1b32b5f1": ["AI核心概念详解：智能体、大模型与MCP协议"],\n    "176a219a": ["演讲人：AI技术专家"]\n  }\n}',
          },
          id: 'tooluse_cKTmgt4oSuG-1xTCIK0p_w',
          type: 'tool_call',
        },
        {
          name: 'make_new_slide_from_template',
          args: {
            template_page_index: 2,
            page_index: 2,
            replace_content:
              '{\n  "text": {\n    "db61c16c": ["智能体（AI Agent）"],\n    "9dd5986c": ["智能体是人工智能领域的核心概念，指能够自主感知环境、做出决策并执行行动以实现特定目标的实体。它具备自主性、反应性、社会性和适应性等特征，可以是软件程序、机器人或任何具备自主行为的系统，广泛应用于智能家居、自动驾驶、医疗保健等领域。"]\n  }\n}',
          },
          id: 'tooluse_hvDYTNsmQ66g3w7dZL2dew',
          type: 'tool_call',
        },
        {
          name: 'make_new_slide_from_template',
          args: {
            template_page_index: 3,
            page_index: 3,
            replace_content:
              '{\n  "text": {\n    "a9775c2a": ["智能体的核心特征"],\n    "722f74e7": ["自主性"],\n    "085fd6f3": ["反应性"],\n    "1a03320d": ["社会性与适应性"],\n    "e1f85f4b": ["智能体能独立运行，无需人为干预，可根据预设规则或学习算法自主决策，在无人值守情况下高效完成任务。"],\n    "bc2c8fe3": ["智能体能感知环境变化并对其作出反应，通过不断调整自身行为以适应环境，实现最优效果。"],\n    "bdff886a": ["多个智能体能相互通信、协调与合作，共同完成任务；同时通过学习、进化等方式不断提升自身性能。"]\n  }\n}',
          },
          id: 'tooluse_po0NzFweS-mMMDtLcmuikQ',
          type: 'tool_call',
        },
        {
          name: 'make_new_slide_from_template',
          args: {
            template_page_index: 2,
            page_index: 4,
            replace_content:
              '{\n  "text": {\n    "db61c16c": ["Agent（智能代理）"],\n    "9dd5986c": ["Agent是一种能够自主理解目标、拆解任务、调用工具并完成复杂操作的智能程序。它通过大语言模型的核心能力（如逻辑推理、知识库调用等），结合外部工具（搜索、代码执行、API接口等），实现近似人类处理问题的流程，具有自主性、多工具协作和记忆学习能力。"]\n  }\n}',
          },
          id: 'tooluse_SGCZELpdRmqRVmB6B8fuYw',
          type: 'tool_call',
        },
        {
          name: 'make_new_slide_from_template',
          args: {
            template_page_index: 3,
            page_index: 5,
            replace_content:
              '{\n  "text": {\n    "a9775c2a": ["Agent的核心能力"],\n    "722f74e7": ["自主规划"],\n    "085fd6f3": ["多工具协作"],\n    "1a03320d": ["记忆与学习"],\n    "e1f85f4b": ["能根据用户目标自动规划步骤，无需逐步指导。例如，用户说"帮我分析销售数据"，Agent可自主调用分析工具、生成图表并总结趋势。"],\n    "bc2c8fe3": ["可调用多种工具（如搜索引擎、代码解释器、API接口）完成任务。例如，回答"天气如何"时，先调用天气API获取数据，再生成回答。"],\n    "bdff886a": ["高级Agent能记住用户偏好和历史交互，提供个性化服务。例如，持续跟踪用户日程并自动提醒待办事项。"]\n  }\n}',
          },
          id: 'tooluse_Rwg6Lye6RDCNZSqh9kF_zQ',
          type: 'tool_call',
        },
        {
          name: 'make_new_slide_from_template',
          args: {
            template_page_index: 2,
            page_index: 6,
            replace_content:
              '{\n  "text": {\n    "db61c16c": ["大模型（Large Model）"],\n    "9dd5986c": ["大模型是指拥有大量参数（数十亿到数千亿）的深度学习模型，通常基于Transformer架构。这些模型能够从大量数据中学习复杂的模式和关系，不仅限于处理语言，也可用于图像识别、语音处理等多种任务，是人工智能技术发展的重要基础。"]\n  }\n}',
          },
          id: 'tooluse_YwRUIa2qSvCHLgDpyUGxBw',
          type: 'tool_call',
        },
        {
          name: 'make_new_slide_from_template',
          args: {
            template_page_index: 3,
            page_index: 7,
            replace_content:
              '{\n  "text": {\n    "a9775c2a": ["大模型的核心特点"],\n    "722f74e7": ["参数规模庞大"],\n    "085fd6f3": ["预训练与微调"],\n    "1a03320d": ["强大泛化能力"],\n    "e1f85f4b": ["大模型通常包含数十亿甚至数千亿个参数，庞大的参数规模使得模型能够学习到更为复杂的特征和模式，在各种任务中表现出色。"],\n    "bc2c8fe3": ["采用预训练和微调的策略，首先在大规模数据集上进行无监督预训练，然后在特定任务上进行有监督的微调，有效提升泛化能力。"],\n    "bdff886a": ["大模型可通过迁移学习，将在一个任务上学到的知识应用到其他相关任务中，极大减少对标注数据的需求，提高新任务表现。"]\n  }\n}',
          },
          id: 'tooluse_JpSoFFLSTGOizhfjPFfRyQ',
          type: 'tool_call',
        },
      ],
      usage: {
        input_tokens: 47797,
        output_tokens: 2001,
        total_tokens: 49798,
        input_token_details: { cache_creation: 0, cache_read: 0 },
      },
    },
    step_id: '',
    timestamp: 1760421911,
    is_llm_message: false,
    session_id: '6e9a138f04bc4ba0',
  },
  {
    id: 72892,
    role: 'assistant',
    type: 'tool_call',
    content: '',
    detail: {
      run_id: '5f1ed0eb-cedc-4cff-970a-b07636c20d7e',
      tool: 'make_new_slide_from_template',
      status: 'pending',
      param: {
        template_page_index: 1,
        page_index: 1,
        replace_content:
          '{\n  "text": {\n    "1b32b5f1": ["AI核心概念详解：智能体、大模型与MCP协议"],\n    "176a219a": ["演讲人：AI技术专家"]\n  }\n}',
      },
      action: '正在调用 make_new_slide_from_template',
      action_content: '',
    },
    step_id: '',
    timestamp: 1760421920,
    is_llm_message: false,
    session_id: '6e9a138f04bc4ba0',
  },
  {
    id: 72893,
    role: 'assistant',
    type: 'tool_call',
    content: '',
    detail: {
      run_id: '5c036d3e-22d2-4f82-85d3-4cdb7389a728',
      tool: 'make_new_slide_from_template',
      status: 'pending',
      param: {
        template_page_index: 2,
        page_index: 2,
        replace_content:
          '{\n  "text": {\n    "db61c16c": ["智能体（AI Agent）"],\n    "9dd5986c": ["智能体是人工智能领域的核心概念，指能够自主感知环境、做出决策并执行行动以实现特定目标的实体。它具备自主性、反应性、社会性和适应性等特征，可以是软件程序、机器人或任何具备自主行为的系统，广泛应用于智能家居、自动驾驶、医疗保健等领域。"]\n  }\n}',
      },
      action: '正在调用 make_new_slide_from_template',
      action_content: '',
    },
    step_id: '',
    timestamp: 1760421923,
    is_llm_message: false,
    session_id: '6e9a138f04bc4ba0',
  },
  {
    id: 72899,
    role: 'assistant',
    type: 'tool_result',
    content: '',
    detail: {
      run_id: '5f1ed0eb-cedc-4cff-970a-b07636c20d7e',
      tool: 'make_new_slide_from_template',
      result: {
        content:
          '{"content": "✅ **第 1 页制作完成**\\n📄 **页面标题**: AI核心概念详解：智能体、大模型与MCP协议\\n📝 **页面内容大纲**:\\n   1. AI核心概念详解：智能体、大模型与MCP协议\\n   2. 演讲人：AI技术专家\\n📊 **统计**: 2 个文本元素\\n💡 基于模板页面设计，内容已成功填充并保存", "content_type": "markdown", "page_index": 1, "template_page_index": 1, "status": "success"}',
        additional_kwargs: {},
        response_metadata: {},
        type: 'tool',
        name: 'make_new_slide_from_template',
        id: 'a5bf8b50-5c09-4541-a641-02e8bd8590ef',
        tool_call_id: 'tooluse_cKTmgt4oSuG-1xTCIK0p_w',
        artifact: null,
        status: 'success',
      },
      status: 'success',
    },
    step_id: '',
    timestamp: 1760421923,
    is_llm_message: false,
    session_id: '6e9a138f04bc4ba0',
  },
];

const plan = {
  id: 72888,
  role: 'assistant',
  type: 'plan',
  content: '',
  detail: {
    steps: [
      {
        id: '1',
        title: '搜集智能体、Agent、大模型、LLM、MCP的详细概念信息',
        status: 'success',
        started_at: 1760421873495,
      },
      { id: '2', title: '选择合适的PPT模板并分析模板结构', status: 'success', started_at: 1760421873495 },
      {
        id: '3',
        title: '创建PPT：封面页 + 5个概念页（智能体、Agent、大模型、LLM、MCP）+ 总结页 + 致谢页，共9页',
        status: 'running',
        started_at: 1760421873495,
      },
      { id: '4', title: '上传PPT到沙箱并生成下载链接', status: 'pending', started_at: 1760421873495 },
      { id: '5', title: '交付最终文件给用户', status: 'pending', started_at: 1760421873495 },
    ],
  },
  step_id: '',
  timestamp: 1760421873,
  is_llm_message: false,
  session_id: '6e9a138f04bc4ba0',
};

describe('multiple tool_call then multiple tool_end', () => {
  it('1', () => {
    const stepByStepMessages = transformChunksToMessages(chunks.slice(0, 1) as MessageChunk[], []);
    const onceMessages = transformChunksToMessages(chunks.slice(0, 1) as MessageChunk[]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [chunks[0]],
      },
      getLoadingMessage(),
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('2', () => {
    const stepByStepMessages = transformChunksToMessages(chunks.slice(1, 2) as MessageChunk[], [
      {
        role: 'user',
        messages: [chunks.slice(0, 1)[0] as MessageChunk],
      },
      getLoadingMessage(),
    ]);
    const onceMessages = transformChunksToMessages(chunks.slice(0, 2) as MessageChunk[]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [chunks.slice(0, 1)[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(chunks.slice(1, 2)[0] as MessageChunk),
            isLast: true,
          },
        ],
      },
    ];
    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('3', () => {
    const stepByStepMessages = transformChunksToMessages(chunks.slice(2, 3) as MessageChunk[], [
      {
        role: 'user',
        messages: [chunks.slice(0, 1)[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(chunks.slice(1, 2)[0] as MessageChunk),
            isLast: true,
          },
        ],
      },
    ]);
    const onceMessages = transformChunksToMessages(chunks.slice(0, 3) as MessageChunk[]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [chunks.slice(0, 1)[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(chunks.slice(1, 2)[0] as MessageChunk),
            isLast: true,
          },
          {
            ...(chunks.slice(2, 3)[0] as MessageChunk),
            type: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.tool,
            isLast: true,
          },
        ],
      },
    ];
    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('4', () => {
    const stepByStepMessages = transformChunksToMessages(chunks.slice(3, 4) as MessageChunk[], [
      {
        role: 'user',
        messages: [chunks.slice(0, 1)[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(chunks.slice(1, 2)[0] as MessageChunk),
            isLast: true,
          },
          {
            ...(chunks.slice(2, 3)[0] as MessageChunk),
            type: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.tool,
            isLast: true,
          },
        ],
      },
    ]);

    const onceMessages = transformChunksToMessages(chunks.slice(0, 4) as MessageChunk[]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [chunks.slice(0, 1)[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(chunks.slice(1, 2)[0] as MessageChunk),
            isLast: true,
          },
          {
            ...(chunks.slice(2, 3)[0] as MessageChunk),
            type: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.tool,
            isLast: true,
          },
          {
            ...(chunks.slice(3, 4)[0] as MessageChunk),
            type: (chunks.slice(3, 4)[0] as MessageToolChunk).detail.tool,
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('5', () => {
    const stepByStepMessages = transformChunksToMessages(chunks.slice(4, 5) as MessageChunk[], [
      {
        role: 'user',
        messages: [chunks.slice(0, 1)[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(chunks.slice(1, 2)[0] as MessageChunk),
            isLast: true,
          },
          {
            ...(chunks.slice(2, 3)[0] as MessageChunk),
            type: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.tool,
            isLast: true,
          },
          {
            ...(chunks.slice(3, 4)[0] as MessageChunk),
            type: (chunks.slice(3, 4)[0] as MessageToolChunk).detail.tool,
            isLast: true,
          },
        ],
      },
    ]);
    const onceMessages = transformChunksToMessages(chunks.slice(0, 5) as MessageChunk[]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [chunks.slice(0, 1)[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(chunks.slice(1, 2)[0] as MessageChunk),
            isLast: true,
          },
          {
            ...(chunks.slice(4, 5)[0] as MessageChunk),
            type: (chunks.slice(4, 5)[0] as MessageToolChunk).detail.tool,
            isLast: true,
            detail: {
              ...(chunks.slice(4, 5)[0] as MessageToolChunk).detail,
              param: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.param,
              action: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.action,
              action_content: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.action_content,
            },
          },
          {
            ...(chunks.slice(3, 4)[0] as MessageChunk),
            type: (chunks.slice(3, 4)[0] as MessageToolChunk).detail.tool,
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });
});

describe('multiple tool_call then multiple tool_end in plan', () => {
  it('user input', () => {
    const stepByStepMessages = transformChunksToMessages(chunks.slice(0, 1) as MessageChunk[], []);
    const onceMessages = transformChunksToMessages(chunks.slice(0, 1) as MessageChunk[]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [chunks[0]],
      },
      getLoadingMessage(),
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('AI replies with a plan', () => {
    const stepByStepMessages = transformChunksToMessages(
      [plan as MessageChunk],
      [
        {
          role: 'user',
          messages: [chunks[0] as MessageChunk],
        },
        getLoadingMessage(),
      ],
    );
    const onceMessages = transformChunksToMessages([...(chunks.slice(0, 1) as MessageChunk[]), plan as MessageChunk]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [chunks[0]],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(plan as MessageChunk),
            children: [
              {
                id: '1',
                title: '搜集智能体、Agent、大模型、LLM、MCP的详细概念信息',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: '选择合适的PPT模板并分析模板结构',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: '创建PPT：封面页 + 5个概念页（智能体、Agent、大模型、LLM、MCP）+ 总结页 + 致谢页，共9页',
                status: 'running',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '4',
                title: '上传PPT到沙箱并生成下载链接',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: '交付最终文件给用户', status: 'pending', started_at: 1760421873495, children: [] },
            ],
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('plan adds text', () => {
    const stepByStepMessages = transformChunksToMessages(chunks.slice(1, 2) as MessageChunk[], [
      {
        role: 'user',
        messages: [chunks[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(plan as MessageChunk),
            children: [
              {
                id: '1',
                title: '搜集智能体、Agent、大模型、LLM、MCP的详细概念信息',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: '选择合适的PPT模板并分析模板结构',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: '创建PPT：封面页 + 5个概念页（智能体、Agent、大模型、LLM、MCP）+ 总结页 + 致谢页，共9页',
                status: 'running',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '4',
                title: '上传PPT到沙箱并生成下载链接',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: '交付最终文件给用户', status: 'pending', started_at: 1760421873495, children: [] },
            ],
            isLast: true,
          },
        ],
      },
    ]);
    const onceMessages = transformChunksToMessages([
      ...(chunks.slice(0, 1) as MessageChunk[]),
      plan as MessageChunk,
      ...(chunks.slice(1, 2) as MessageChunk[]),
    ]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [chunks[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(plan as MessageChunk),
            children: [
              {
                id: '1',
                title: '搜集智能体、Agent、大模型、LLM、MCP的详细概念信息',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: '选择合适的PPT模板并分析模板结构',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: '创建PPT：封面页 + 5个概念页（智能体、Agent、大模型、LLM、MCP）+ 总结页 + 致谢页，共9页',
                status: 'running',
                started_at: 1760421873495,
                children: [{ ...(chunks.slice(1, 2)[0] as MessageChunk), isLast: true }],
              },
              {
                id: '4',
                title: '上传PPT到沙箱并生成下载链接',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: '交付最终文件给用户', status: 'pending', started_at: 1760421873495, children: [] },
            ],
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('plan adds tool_call1', () => {
    const stepByStepMessages = transformChunksToMessages(chunks.slice(2, 3) as MessageChunk[], [
      {
        role: 'user',
        messages: [chunks[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(plan as MessageChunk),
            children: [
              {
                id: '1',
                title: '搜集智能体、Agent、大模型、LLM、MCP的详细概念信息',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: '选择合适的PPT模板并分析模板结构',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: '创建PPT：封面页 + 5个概念页（智能体、Agent、大模型、LLM、MCP）+ 总结页 + 致谢页，共9页',
                status: 'running',
                started_at: 1760421873495,
                children: [{ ...(chunks.slice(1, 2)[0] as MessageChunk), isLast: true }],
              },
              {
                id: '4',
                title: '上传PPT到沙箱并生成下载链接',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: '交付最终文件给用户', status: 'pending', started_at: 1760421873495, children: [] },
            ],
            isLast: true,
          },
        ],
      },
    ]);

    const onceMessages = transformChunksToMessages([
      ...(chunks.slice(0, 1) as MessageChunk[]),
      plan as MessageChunk,
      ...(chunks.slice(1, 3) as MessageChunk[]),
    ]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [chunks[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(plan as MessageChunk),
            children: [
              {
                id: '1',
                title: '搜集智能体、Agent、大模型、LLM、MCP的详细概念信息',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: '选择合适的PPT模板并分析模板结构',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: '创建PPT：封面页 + 5个概念页（智能体、Agent、大模型、LLM、MCP）+ 总结页 + 致谢页，共9页',
                status: 'running',
                started_at: 1760421873495,
                children: [
                  { ...(chunks.slice(1, 2)[0] as MessageChunk), isLast: true },
                  {
                    ...(chunks.slice(2, 3)[0] as MessageChunk),
                    type: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.tool,
                    isLast: true,
                  },
                ],
              },
              {
                id: '4',
                title: '上传PPT到沙箱并生成下载链接',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: '交付最终文件给用户', status: 'pending', started_at: 1760421873495, children: [] },
            ],
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('plan adds tool_call2', () => {
    const stepByStepMessages = transformChunksToMessages(chunks.slice(3, 4) as MessageChunk[], [
      {
        role: 'user',
        messages: [chunks[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(plan as MessageChunk),
            children: [
              {
                id: '1',
                title: '搜集智能体、Agent、大模型、LLM、MCP的详细概念信息',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: '选择合适的PPT模板并分析模板结构',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: '创建PPT：封面页 + 5个概念页（智能体、Agent、大模型、LLM、MCP）+ 总结页 + 致谢页，共9页',
                status: 'running',
                started_at: 1760421873495,
                children: [
                  { ...(chunks.slice(1, 2)[0] as MessageChunk), isLast: true },
                  {
                    ...(chunks.slice(2, 3)[0] as MessageChunk),
                    type: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.tool,
                    isLast: true,
                  },
                ],
              },
              {
                id: '4',
                title: '上传PPT到沙箱并生成下载链接',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: '交付最终文件给用户', status: 'pending', started_at: 1760421873495, children: [] },
            ],
            isLast: true,
          },
        ],
      },
    ]);
    const onceMessages = transformChunksToMessages([
      ...(chunks.slice(0, 1) as MessageChunk[]),
      plan as MessageChunk,
      ...(chunks.slice(1, 4) as MessageChunk[]),
    ]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [chunks[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(plan as MessageChunk),
            children: [
              {
                id: '1',
                title: '搜集智能体、Agent、大模型、LLM、MCP的详细概念信息',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: '选择合适的PPT模板并分析模板结构',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: '创建PPT：封面页 + 5个概念页（智能体、Agent、大模型、LLM、MCP）+ 总结页 + 致谢页，共9页',
                status: 'running',
                started_at: 1760421873495,
                children: [
                  { ...(chunks.slice(1, 2)[0] as MessageChunk), isLast: true },
                  {
                    ...(chunks.slice(2, 3)[0] as MessageChunk),
                    type: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.tool,
                    isLast: true,
                  },
                  {
                    ...(chunks.slice(3, 4)[0] as MessageChunk),
                    type: (chunks.slice(3, 4)[0] as MessageToolChunk).detail.tool,
                    isLast: true,
                  },
                ],
              },
              {
                id: '4',
                title: '上传PPT到沙箱并生成下载链接',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: '交付最终文件给用户', status: 'pending', started_at: 1760421873495, children: [] },
            ],
            isLast: true,
          },
        ],
      },
    ];
    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });
  it('plan adds tool_end1', () => {
    const stepByStepMessages = transformChunksToMessages(chunks.slice(4, 5) as MessageChunk[], [
      {
        role: 'user',
        messages: [chunks[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(plan as MessageChunk),
            children: [
              {
                id: '1',
                title: '搜集智能体、Agent、大模型、LLM、MCP的详细概念信息',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: '选择合适的PPT模板并分析模板结构',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: '创建PPT：封面页 + 5个概念页（智能体、Agent、大模型、LLM、MCP）+ 总结页 + 致谢页，共9页',
                status: 'running',
                started_at: 1760421873495,
                children: [
                  { ...(chunks.slice(1, 2)[0] as MessageChunk), isLast: true },
                  {
                    ...(chunks.slice(2, 3)[0] as MessageChunk),
                    type: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.tool,
                    isLast: true,
                  },
                  {
                    ...(chunks.slice(3, 4)[0] as MessageChunk),
                    type: (chunks.slice(3, 4)[0] as MessageToolChunk).detail.tool,
                    isLast: true,
                  },
                ],
              },
              {
                id: '4',
                title: '上传PPT到沙箱并生成下载链接',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: '交付最终文件给用户', status: 'pending', started_at: 1760421873495, children: [] },
            ],
            isLast: true,
          },
        ],
      },
    ]);
    const onceMessages = transformChunksToMessages([
      ...(chunks.slice(0, 1) as MessageChunk[]),
      plan as MessageChunk,
      ...(chunks.slice(1, 5) as MessageChunk[]),
    ]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [chunks[0] as MessageChunk],
      },
      {
        role: 'assistant',
        messages: [
          {
            ...(plan as MessageChunk),
            children: [
              {
                id: '1',
                title: '搜集智能体、Agent、大模型、LLM、MCP的详细概念信息',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: '选择合适的PPT模板并分析模板结构',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: '创建PPT：封面页 + 5个概念页（智能体、Agent、大模型、LLM、MCP）+ 总结页 + 致谢页，共9页',
                status: 'running',
                started_at: 1760421873495,
                children: [
                  { ...(chunks.slice(1, 2)[0] as MessageChunk), isLast: true },
                  {
                    ...(chunks.slice(4, 5)[0] as MessageChunk),
                    type: (chunks.slice(4, 5)[0] as MessageToolChunk).detail.tool,
                    detail: {
                      ...(chunks.slice(4, 5)[0] as MessageToolChunk).detail,
                      param: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.param,
                      action: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.action,
                      action_content: (chunks.slice(2, 3)[0] as MessageToolChunk).detail.action_content,
                    },
                    isLast: true,
                  },
                  {
                    ...(chunks.slice(3, 4)[0] as MessageChunk),
                    type: (chunks.slice(3, 4)[0] as MessageToolChunk).detail.tool,
                    isLast: true,
                  },
                ],
              },
              {
                id: '4',
                title: '上传PPT到沙箱并生成下载链接',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: '交付最终文件给用户', status: 'pending', started_at: 1760421873495, children: [] },
            ],
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });
});
