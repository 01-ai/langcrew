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
      'Explain the intelligence,Agent、Large models,LLM、MCPI\'m not sure I\'m going to be able to do that.Agent、Large models,LLM、MCPEach one is described in one page, and ultimately a summary is made in one page.',
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
    content: 'Now I\'m starting to createPPT，Total9Pages, smarts,Agent、Large models,LLM、MCP、Summary page, thanks page.',
    detail: {
      run_id: 'baf4ad73-962c-4e9b-8694-a4cc3fa74a0d',
      full_content: 'Now I\'m starting to createPPT，Total9Pages, smarts,Agent、Large models,LLM、MCP、Summary page, thanks page.',
      tool_calls: [
        {
          name: 'make_new_slide_from_template',
          args: {
            template_page_index: 1,
            page_index: 1,
            replace_content:
              '{\n  "text": {\n    "1b32b5f1": ["AICore conceptual details: smart bodies, large models andMCPAgreements"],\n    "176a219a": ["Presenter:AITechnical experts"]\n  }\n}',
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
              '{\n  "text": {\n    "db61c16c": ["Smart Body(s)AI Agent）"],\n    "9dd5986c": ["Smart bodies are the core concept in the realm of artificial intelligence, which refers to entities that are able to feel the environment, make decisions and implement actions to achieve specific objectives. They have the characteristics of autonomy, responsiveness, sociality and adaptability, which can be software programs, robots or any system with autonomous behaviour, and are widely used in areas such as intelligent homes, autopilots, and health care."]\n  }\n}',
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
              '{\n  "text": {\n    "a9775c2a": ["Core features of the intelligence system"],\n    "722f74e7": ["Autonomy"],\n    "085fd6f3": ["Reactional"],\n    "1a03320d": ["Social and adaptive"],\n    "e1f85f4b": ["Smart bodies operate independently, without human intervention, and can make decisions independently, based on pre-established rules or learning algorithms, to perform their tasks efficiently and without merit."],\n    "bc2c8fe3": ["Smart body energy recognizes and responds to environmental change, achieving optimal results by constantly adapting its behaviour to the environment."],\n    "bdff886a": ["Multiple intelligent bodies communicate, coordinate and cooperate with each other in the fulfilment of their mandates, while constantly improving their performance through learning and evolution."]\n  }\n}',
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
              '{\n  "text": {\n    "db61c16c": ["Agent（I\'m not a smart agent."],\n    "9dd5986c": ["AgentIt combines external tools (search, code, code, etc.) with the core competencies of the Big Language Model (e.g., logical reasoning, knowledge base call).API(c) Accompanying, etc.) to achieve processes that are close to human-friendly and have autonomy, multi-tool collaboration and memory learning."]\n  }\n}',
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
              '{\n  "text": {\n    "a9775c2a": ["AgentCore competencies"],\n    "722f74e7": ["Autonomy planning"],\n    "085fd6f3": ["Multi-tool collaboration"],\n    "1a03320d": ["Memory and learning"],\n    "e1f85f4b": ["You can plan steps automatically according to the user\'s target, without guidance."Help me analyze sales data."，AgentIt can call analytical tools, generate charts and summarize trends."],\n    "bc2c8fe3": ["Various tools (e.g. search engine, code interpreter,APIThe interface) is completed. For example, answer"How\'s the weather?" When you call the weather first APIGet the data, and then generate the answers."],\n    "bdff886a": ["AdvancedAgentRemembers user preferences and history interactions and provides personalized services. For example, keep track of user schedules and automatically alert to to-dos."]\n  }\n}',
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
              '{\n  "text": {\n    "db61c16c": ["Large model (Large Model）"],\n    "9dd5986c": ["Large models are deep learning models with a large number of parameters (billions to hundreds of billions), usually based onTransformerStructure. These models are an important basis for the development of artificial intelligence technology by learning complex patterns and relationships from a large amount of data, not just in terms of language processing, but also in a variety of tasks, such as image recognition, voice processing and so forth."]\n  }\n}',
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
              '{\n  "text": {\n    "a9775c2a": ["Core features of the large model"],\n    "722f74e7": ["Size of parameters"],\n    "085fd6f3": ["Pre-training and fine-tuning"],\n    "1a03320d": ["Powerful panorama."],\n    "e1f85f4b": ["Large models typically contain billions or even hundreds of billions of parameters, and large parameters sizes allow models to learn more complex features and patterns and to perform well in a variety of tasks."],\n    "bc2c8fe3": ["The strategy of pre-training and fine-tuning is to first train without supervision on large-scale data sets, followed by supervised fine-tuning on specific tasks and effectively enhance the capacity for broad-based adaptation."],\n    "bdff886a": ["Large models can be learned through migration and the knowledge learned from one mission will be applied to other related tasks, significantly reducing the need for labeled data and improving the performance of new missions."]\n  }\n}',
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
          '{\n  "text": {\n    "1b32b5f1": ["AICore conceptual details: smart bodies, large models andMCPAgreements"],\n    "176a219a": ["Presenter:AITechnical experts"]\n  }\n}',
      },
      action: 'Calling make_new_slide_from_template',
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
          '{\n  "text": {\n    "db61c16c": ["Smart Body(s)AI Agent）"],\n    "9dd5986c": ["Smart bodies are the core concept in the realm of artificial intelligence, which refers to entities that are able to feel the environment, make decisions and implement actions to achieve specific objectives. They have the characteristics of autonomy, responsiveness, sociality and adaptability, which can be software programs, robots or any system with autonomous behaviour, and are widely used in areas such as intelligent homes, autopilots, and health care."]\n  }\n}',
      },
      action: 'Calling make_new_slide_from_template',
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
          '{"content": "✅ **I\'m sorry. 1 Page production completed**\\n📄 **Page Title**: AICore conceptual details: smart bodies, large models andMCPAgreements\\n📝 **Page Content Outline**:\\n   1. AICore conceptual details: smart bodies, large models andMCPAgreements\\n   2. Presenter:AITechnical experts\\n📊 **Statistics**: 2 Text elements\\n💡 Template-based page design, content successfully filled and saved", "content_type": "markdown", "page_index": 1, "template_page_index": 1, "status": "success"}',
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
        title: 'Collecting intelligence,Agent、Large models,LLM、MCPand detailed conceptual information',
        status: 'success',
        started_at: 1760421873495,
      },
      { id: '2', title: 'Select the rightPPTTemplates and analysis of template structures', status: 'success', started_at: 1760421873495 },
      {
        id: '3',
        title: 'CreatePPT：Cover Page + 5Concept pages (smart,Agent、Large models,LLM、MCP）+ Summary page + Acknowledgement page, total9Page',
        status: 'running',
        started_at: 1760421873495,
      },
      { id: '4', title: 'UploadPPTGo to Sandbox and generate download links', status: 'pending', started_at: 1760421873495 },
      { id: '5', title: 'Delivery of final file to user', status: 'pending', started_at: 1760421873495 },
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
  it('User Input', () => {
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

  it('AIReplyplan', () => {
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
                title: 'Collecting intelligence,Agent、Large models,LLM、MCPand detailed conceptual information',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: 'Select the rightPPTTemplates and analysis of template structures',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: 'CreatePPT：Cover Page + 5Concept pages (smart,Agent、Large models,LLM、MCP）+ Summary page + Acknowledgement page, total9Page',
                status: 'running',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '4',
                title: 'UploadPPTGo to Sandbox and generate download links',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: 'Delivery of final file to user', status: 'pending', started_at: 1760421873495, children: [] },
            ],
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('planIncreasetext', () => {
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
                title: 'Collecting intelligence,Agent、Large models,LLM、MCPand detailed conceptual information',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: 'Select the rightPPTTemplates and analysis of template structures',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: 'CreatePPT：Cover Page + 5Concept pages (smart,Agent、Large models,LLM、MCP）+ Summary page + Acknowledgement page, total9Page',
                status: 'running',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '4',
                title: 'UploadPPTGo to Sandbox and generate download links',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: 'Delivery of final file to user', status: 'pending', started_at: 1760421873495, children: [] },
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
                title: 'Collecting intelligence,Agent、Large models,LLM、MCPand detailed conceptual information',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: 'Select the rightPPTTemplates and analysis of template structures',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: 'CreatePPT：Cover Page + 5Concept pages (smart,Agent、Large models,LLM、MCP）+ Summary page + Acknowledgement page, total9Page',
                status: 'running',
                started_at: 1760421873495,
                children: [{ ...(chunks.slice(1, 2)[0] as MessageChunk), isLast: true }],
              },
              {
                id: '4',
                title: 'UploadPPTGo to Sandbox and generate download links',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: 'Delivery of final file to user', status: 'pending', started_at: 1760421873495, children: [] },
            ],
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('planIncreasetool_call1', () => {
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
                title: 'Collecting intelligence,Agent、Large models,LLM、MCPand detailed conceptual information',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: 'Select the rightPPTTemplates and analysis of template structures',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: 'CreatePPT：Cover Page + 5Concept pages (smart,Agent、Large models,LLM、MCP）+ Summary page + Acknowledgement page, total9Page',
                status: 'running',
                started_at: 1760421873495,
                children: [{ ...(chunks.slice(1, 2)[0] as MessageChunk), isLast: true }],
              },
              {
                id: '4',
                title: 'UploadPPTGo to Sandbox and generate download links',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: 'Delivery of final file to user', status: 'pending', started_at: 1760421873495, children: [] },
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
                title: 'Collecting intelligence,Agent、Large models,LLM、MCPand detailed conceptual information',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: 'Select the rightPPTTemplates and analysis of template structures',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: 'CreatePPT：Cover Page + 5Concept pages (smart,Agent、Large models,LLM、MCP）+ Summary page + Acknowledgement page, total9Page',
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
                title: 'UploadPPTGo to Sandbox and generate download links',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: 'Delivery of final file to user', status: 'pending', started_at: 1760421873495, children: [] },
            ],
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('planIncreasetool_call2', () => {
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
                title: 'Collecting intelligence,Agent、Large models,LLM、MCPand detailed conceptual information',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: 'Select the rightPPTTemplates and analysis of template structures',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: 'CreatePPT：Cover Page + 5Concept pages (smart,Agent、Large models,LLM、MCP）+ Summary page + Acknowledgement page, total9Page',
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
                title: 'UploadPPTGo to Sandbox and generate download links',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: 'Delivery of final file to user', status: 'pending', started_at: 1760421873495, children: [] },
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
                title: 'Collecting intelligence,Agent、Large models,LLM、MCPand detailed conceptual information',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: 'Select the rightPPTTemplates and analysis of template structures',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: 'CreatePPT：Cover Page + 5Concept pages (smart,Agent、Large models,LLM、MCP）+ Summary page + Acknowledgement page, total9Page',
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
                title: 'UploadPPTGo to Sandbox and generate download links',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: 'Delivery of final file to user', status: 'pending', started_at: 1760421873495, children: [] },
            ],
            isLast: true,
          },
        ],
      },
    ];
    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });
  it('planIncreasetool_end1', () => {
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
                title: 'Collecting intelligence,Agent、Large models,LLM、MCPand detailed conceptual information',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: 'Select the rightPPTTemplates and analysis of template structures',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: 'CreatePPT：Cover Page + 5Concept pages (smart,Agent、Large models,LLM、MCP）+ Summary page + Acknowledgement page, total9Page',
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
                title: 'UploadPPTGo to Sandbox and generate download links',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: 'Delivery of final file to user', status: 'pending', started_at: 1760421873495, children: [] },
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
                title: 'Collecting intelligence,Agent、Large models,LLM、MCPand detailed conceptual information',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '2',
                title: 'Select the rightPPTTemplates and analysis of template structures',
                status: 'success',
                started_at: 1760421873495,
                children: [],
              },
              {
                id: '3',
                title: 'CreatePPT：Cover Page + 5Concept pages (smart,Agent、Large models,LLM、MCP）+ Summary page + Acknowledgement page, total9Page',
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
                title: 'UploadPPTGo to Sandbox and generate download links',
                status: 'pending',
                started_at: 1760421873495,
                children: [],
              },
              { id: '5', title: 'Delivery of final file to user', status: 'pending', started_at: 1760421873495, children: [] },
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
