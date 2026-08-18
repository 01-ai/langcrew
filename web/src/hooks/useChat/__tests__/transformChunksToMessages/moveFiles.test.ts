import { describe, it, expect } from 'vitest';
import { getLoadingMessage } from '../../utils';
import { MessageChunk } from '@/types';
import { transformChunksToMessages } from '../../transformChunksToMessages';

describe('transformChunksToMessages', () => {
  it('moveFiles 1', () => {
    const messages = transformChunksToMessages([
      {
        id: 222523,
        role: 'user',
        type: 'text',
        content: '写一个10000字的全国房价波动原因分析报告，在原文中要插入图表数据，我要pdf格式文件',
        detail: {},
        step_id: null,
        timestamp: 1758628384,
        is_llm_message: false,
        session_id: 'fc7ab6bb39d14b08',
      },
    ]);
    expect(messages).toEqual([
      {
        role: 'user',
        messages: [
          {
            id: 222523,
            role: 'user',
            type: 'text',
            content: '写一个10000字的全国房价波动原因分析报告，在原文中要插入图表数据，我要pdf格式文件',
            detail: {},
            step_id: null,
            timestamp: 1758628384,
            is_llm_message: false,
            session_id: 'fc7ab6bb39d14b08',
          },
        ],
      },
      getLoadingMessage(),
    ]);
  });

  it('moveFiles 2', () => {
    const messages = transformChunksToMessages(
      [
        {
          id: 222524,
          role: 'assistant',
          type: 'text',
          content:
            '我将按照下列计划进行工作：\n\n1. 收集全国房价波动相关数据和资料\n2. 分析房价波动的主要原因和影响因素\n3. 创建数据分析图表和可视化\n4. 撰写10000字的分析报告\n5. 将报告转换为PDF格式\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
          detail: {},
          step_id: '',
          timestamp: 1758628390,
          is_llm_message: false,
          session_id: 'fc7ab6bb39d14b08',
        },
      ],
      [
        {
          role: 'user',
          messages: [
            {
              id: 222523,
              role: 'user',
              type: 'text',
              content: '写一个10000字的全国房价波动原因分析报告，在原文中要插入图表数据，我要pdf格式文件',
              detail: {},
              step_id: null,
              timestamp: 1758628384,
              is_llm_message: false,
              session_id: 'fc7ab6bb39d14b08',
            },
          ],
        },
        getLoadingMessage(),
      ],
    );

    expect(messages).toEqual([
      {
        role: 'user',
        messages: [
          {
            id: 222523,
            role: 'user',
            type: 'text',
            content: '写一个10000字的全国房价波动原因分析报告，在原文中要插入图表数据，我要pdf格式文件',
            detail: {},
            step_id: null,
            timestamp: 1758628384,
            is_llm_message: false,
            session_id: 'fc7ab6bb39d14b08',
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: 222524,
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 收集全国房价波动相关数据和资料\n2. 分析房价波动的主要原因和影响因素\n3. 创建数据分析图表和可视化\n4. 撰写10000字的分析报告\n5. 将报告转换为PDF格式\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            step_id: '',
            timestamp: 1758628390,
            is_llm_message: false,
            session_id: 'fc7ab6bb39d14b08',
            // Add isLast
            isLast: true,
          },
        ],
      },
    ]);
  });
});

const chunks2 = [
  {
    id: 457,
    role: 'user',
    type: 'text',
    content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
    detail: {},
    step_id: null,
    timestamp: 1759045815,
    is_llm_message: false,
    session_id: '0f92702c01d44411',
  },
  {
    id: 458,
    role: 'assistant',
    type: 'text',
    content: '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
    detail: {
      run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
      full_content: '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
      tool_calls: [
        {
          name: 'plan',
          args: {
            plans: [
              {
                id: '1',
                content: '搜索最新的全国房价数据和市场趋势信息',
                status: 'running',
              },
              {
                id: '2',
                content: '收集房价相关统计数据并制作图表',
                status: 'pending',
              },
              {
                id: '3',
                content: '撰写2000字的房价走势预测报告',
                status: 'pending',
              },
              {
                id: '4',
                content: '生成包含图表的PDF文档',
                status: 'pending',
              },
            ],
          },
          id: 'call_n8w2s40hxg2rqrlrmd9bzjs1',
          type: 'tool_call',
        },
      ],
      usage: {
        input_tokens: 4964,
        output_tokens: 134,
        total_tokens: 5098,
        input_token_details: {
          cache_read: 0,
        },
        output_token_details: {
          reasoning: 0,
        },
      },
    },
    step_id: '',
    timestamp: 1759045820,
    is_llm_message: false,
    session_id: '0f92702c01d44411',
  },
  {
    id: 459,
    role: 'assistant',
    type: 'text',
    content:
      '我将按照下列计划进行工作：\n\n1. 搜索最新的全国房价数据和市场趋势信息\n2. 收集房价相关统计数据并制作图表\n3. 撰写2000字的房价走势预测报告\n4. 生成包含图表的PDF文档\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
    detail: {},
    step_id: '',
    timestamp: 1759045820,
    is_llm_message: false,
    session_id: '0f92702c01d44411',
  },
  {
    id: 460,
    role: 'assistant',
    type: 'plan',
    content: '',
    detail: {
      steps: [
        {
          id: '1',
          title: '搜索最新的全国房价数据和市场趋势信息',
          status: 'running',
          started_at: 1759045820906,
        },
        {
          id: '2',
          title: '收集房价相关统计数据并制作图表',
          status: 'pending',
          started_at: 1759045820906,
        },
        {
          id: '3',
          title: '撰写2000字的房价走势预测报告',
          status: 'pending',
          started_at: 1759045820906,
        },
        {
          id: '4',
          title: '生成包含图表的PDF文档',
          status: 'pending',
          started_at: 1759045820906,
        },
      ],
    },
    step_id: '',
    timestamp: 1759045820,
    is_llm_message: false,
    session_id: '0f92702c01d44411',
  },
  {
    id: 461,
    role: 'assistant',
    type: 'text',
    content: '让我先搜索最新的全国房价数据和市场趋势信息。',
    detail: {
      run_id: '05f254a4-e8e3-475b-9b29-39c56bd1850e',
      full_content: '让我先搜索最新的全国房价数据和市场趋势信息。',
      tool_calls: [
        {
          name: 'web_search',
          args: {
            query: '2024-2025年全国房价走势预测 房地产市场分析',
            query_num: 15,
          },
          id: 'call_dcqb8h8cgwdxts36ig37hid0',
          type: 'tool_call',
        },
      ],
      usage: {
        input_tokens: 5178,
        output_tokens: 42,
        total_tokens: 5220,
        input_token_details: {
          cache_read: 0,
        },
        output_token_details: {
          reasoning: 0,
        },
      },
    },
    step_id: '',
    timestamp: 1759045823,
    is_llm_message: false,
    session_id: '0f92702c01d44411',
  },
  {
    id: 538,
    role: 'assistant',
    type: 'tool_call',
    content: '',
    detail: {
      run_id: 'a3a48e81-3949-421a-a2e9-244dd3d335b6',
      tool: 'agent_result_delivery',
      status: 'pending',
      param: {
        attachments: [
          '/workspace/全国房价走势预测报告.md',
          '/workspace/房价走势图1.png',
          '/workspace/房价同比变化图.png',
          '/workspace/各线城市价格对比.png',
        ],
      },
      action: '正在调用 agent_result_delivery',
      action_content: '',
    },
    step_id: '',
    timestamp: 1759046286,
    is_llm_message: false,
    session_id: '0f92702c01d44411',
  },
  {
    id: 539,
    role: 'assistant',
    type: 'tool_result',
    content: '',
    detail: {
      run_id: 'a3a48e81-3949-421a-a2e9-244dd3d335b6',
      tool: 'agent_result_delivery',
      result: {
        additional_kwargs: {},
        response_metadata: {},
        type: 'tool',
        name: 'agent_result_delivery',
        id: null,
        tool_call_id: 'call_uaw9w2zkncg5w67twzmi5lgs',
        artifact: null,
        status: 'success',
      },
      status: 'success',
      attachments: [
        {
          filename: 'todo.md',
          path: '',
          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/todo.md',
          size: 244,
          content_type: 'application/octet-stream',
          show_user: 0,
        },
        {
          filename: '房价走势图1.png',
          path: '/workspace/房价走势图1.png',
          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/房价走势图1.png',
          size: 283361,
          content_type: 'image/png',
          show_user: 1,
        },
        {
          filename: '房价同比变化图.png',
          path: '/workspace/房价同比变化图.png',
          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/房价同比变化图.png',
          size: 184938,
          content_type: 'image/png',
          show_user: 1,
        },
        {
          filename: '各线城市价格对比.png',
          path: '/workspace/各线城市价格对比.png',
          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/各线城市价格对比.png',
          size: 124350,
          content_type: 'image/png',
          show_user: 1,
        },
        {
          filename: '全国房价走势预测报告.md',
          path: '/workspace/全国房价走势预测报告.md',
          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/全国房价走势预测报告.md',
          size: 7616,
          content_type: 'application/octet-stream',
          show_user: 1,
        },
        {
          filename: 'report_style.css',
          path: '',
          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/report_style.css',
          size: 2005,
          content_type: 'text/css',
          show_user: 0,
        },
        {
          filename: '全国房价走势预测报告.html',
          path: '',
          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/全国房价走势预测报告.html',
          size: 9881,
          content_type: 'text/html',
          show_user: 0,
        },
      ],
    },
    step_id: '',
    timestamp: 1759046287,
    is_llm_message: false,
    session_id: '0f92702c01d44411',
  },
];

describe('move files from plan', () => {
  it('1', () => {
    const messages = transformChunksToMessages(chunks2.slice(0, 1) as MessageChunk[]);

    expect(messages).toEqual([
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
            detail: {},
            step_id: null,
            timestamp: 1759045815,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
          },
        ],
      },
      getLoadingMessage(),
    ]);
  });

  it('2', () => {
    // Run step by step
    const stepByStepMessages = transformChunksToMessages(chunks2.slice(1, 2) as MessageChunk[], [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
            detail: {},
            step_id: null,
            timestamp: 1759045815,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
          },
        ],
      },
      getLoadingMessage(),
    ]);

    // Run all at once
    const onceMessages = transformChunksToMessages(chunks2.slice(0, 2) as MessageChunk[]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
            detail: {},
            step_id: null,
            timestamp: 1759045815,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: 458,
            role: 'assistant',
            type: 'text',
            content: '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: '搜索最新的全国房价数据和市场趋势信息',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: '收集房价相关统计数据并制作图表',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: '撰写2000字的房价走势预测报告',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: '生成包含图表的PDF文档',
                        status: 'pending',
                      },
                    ],
                  },
                  id: 'call_n8w2s40hxg2rqrlrmd9bzjs1',
                  type: 'tool_call',
                },
              ],
              usage: {
                input_tokens: 4964,
                output_tokens: 134,
                total_tokens: 5098,
                input_token_details: {
                  cache_read: 0,
                },
                output_token_details: {
                  reasoning: 0,
                },
              },
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });
  it('3', () => {
    const stepByStepMessages = transformChunksToMessages(chunks2.slice(2, 3) as MessageChunk[], [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
            detail: {},
            step_id: null,
            timestamp: 1759045815,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: 458,
            role: 'assistant',
            type: 'text',
            content: '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: '搜索最新的全国房价数据和市场趋势信息',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: '收集房价相关统计数据并制作图表',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: '撰写2000字的房价走势预测报告',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: '生成包含图表的PDF文档',
                        status: 'pending',
                      },
                    ],
                  },
                  id: 'call_n8w2s40hxg2rqrlrmd9bzjs1',
                  type: 'tool_call',
                },
              ],
              usage: {
                input_tokens: 4964,
                output_tokens: 134,
                total_tokens: 5098,
                input_token_details: {
                  cache_read: 0,
                },
                output_token_details: {
                  reasoning: 0,
                },
              },
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
        ],
      },
    ]);

    const onceMessages = transformChunksToMessages(chunks2.slice(0, 3) as MessageChunk[]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
            detail: {},
            step_id: null,
            timestamp: 1759045815,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: 458,
            role: 'assistant',
            type: 'text',
            content: '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: '搜索最新的全国房价数据和市场趋势信息',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: '收集房价相关统计数据并制作图表',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: '撰写2000字的房价走势预测报告',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: '生成包含图表的PDF文档',
                        status: 'pending',
                      },
                    ],
                  },
                  id: 'call_n8w2s40hxg2rqrlrmd9bzjs1',
                  type: 'tool_call',
                },
              ],
              usage: {
                input_tokens: 4964,
                output_tokens: 134,
                total_tokens: 5098,
                input_token_details: {
                  cache_read: 0,
                },
                output_token_details: {
                  reasoning: 0,
                },
              },
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 搜索最新的全国房价数据和市场趋势信息\n2. 收集房价相关统计数据并制作图表\n3. 撰写2000字的房价走势预测报告\n4. 生成包含图表的PDF文档\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);

    expect(onceMessages).toEqual(expectedMessages);
  });

  it('4: add plan', () => {
    const stepByStepMessages = transformChunksToMessages(chunks2.slice(3, 4) as MessageChunk[], [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
            detail: {},
            step_id: null,
            timestamp: 1759045815,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: 458,
            role: 'assistant',
            type: 'text',
            content: '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: '搜索最新的全国房价数据和市场趋势信息',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: '收集房价相关统计数据并制作图表',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: '撰写2000字的房价走势预测报告',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: '生成包含图表的PDF文档',
                        status: 'pending',
                      },
                    ],
                  },
                  id: 'call_n8w2s40hxg2rqrlrmd9bzjs1',
                  type: 'tool_call',
                },
              ],
              usage: {
                input_tokens: 4964,
                output_tokens: 134,
                total_tokens: 5098,
                input_token_details: {
                  cache_read: 0,
                },
                output_token_details: {
                  reasoning: 0,
                },
              },
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 搜索最新的全国房价数据和市场趋势信息\n2. 收集房价相关统计数据并制作图表\n3. 撰写2000字的房价走势预测报告\n4. 生成包含图表的PDF文档\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
        ],
      },
    ]);

    const onceMessages = transformChunksToMessages(chunks2.slice(0, 4) as MessageChunk[]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
            detail: {},
            step_id: null,
            timestamp: 1759045815,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: 458,
            role: 'assistant',
            type: 'text',
            content: '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: '搜索最新的全国房价数据和市场趋势信息',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: '收集房价相关统计数据并制作图表',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: '撰写2000字的房价走势预测报告',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: '生成包含图表的PDF文档',
                        status: 'pending',
                      },
                    ],
                  },
                  id: 'call_n8w2s40hxg2rqrlrmd9bzjs1',
                  type: 'tool_call',
                },
              ],
              usage: {
                input_tokens: 4964,
                output_tokens: 134,
                total_tokens: 5098,
                input_token_details: {
                  cache_read: 0,
                },
                output_token_details: {
                  reasoning: 0,
                },
              },
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 搜索最新的全国房价数据和市场趋势信息\n2. 收集房价相关统计数据并制作图表\n3. 撰写2000字的房价走势预测报告\n4. 生成包含图表的PDF文档\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children
            children: [
              {
                id: '1',
                title: '搜索最新的全国房价数据和市场趋势信息',
                status: 'running',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '2',
                title: '收集房价相关统计数据并制作图表',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '3',
                title: '撰写2000字的房价走势预测报告',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '4',
                title: '生成包含图表的PDF文档',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: '搜索最新的全国房价数据和市场趋势信息',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: '收集房价相关统计数据并制作图表',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: '撰写2000字的房价走势预测报告',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: '生成包含图表的PDF文档',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('5: add in plan', () => {
    const stepByStepMessages = transformChunksToMessages(chunks2.slice(4, 5) as MessageChunk[], [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
            detail: {},
            step_id: null,
            timestamp: 1759045815,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: 458,
            role: 'assistant',
            type: 'text',
            content: '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: '搜索最新的全国房价数据和市场趋势信息',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: '收集房价相关统计数据并制作图表',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: '撰写2000字的房价走势预测报告',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: '生成包含图表的PDF文档',
                        status: 'pending',
                      },
                    ],
                  },
                  id: 'call_n8w2s40hxg2rqrlrmd9bzjs1',
                  type: 'tool_call',
                },
              ],
              usage: {
                input_tokens: 4964,
                output_tokens: 134,
                total_tokens: 5098,
                input_token_details: {
                  cache_read: 0,
                },
                output_token_details: {
                  reasoning: 0,
                },
              },
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 搜索最新的全国房价数据和市场趋势信息\n2. 收集房价相关统计数据并制作图表\n3. 撰写2000字的房价走势预测报告\n4. 生成包含图表的PDF文档\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children
            children: [
              {
                id: '1',
                title: '搜索最新的全国房价数据和市场趋势信息',
                status: 'running',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '2',
                title: '收集房价相关统计数据并制作图表',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '3',
                title: '撰写2000字的房价走势预测报告',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '4',
                title: '生成包含图表的PDF文档',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: '搜索最新的全国房价数据和市场趋势信息',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: '收集房价相关统计数据并制作图表',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: '撰写2000字的房价走势预测报告',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: '生成包含图表的PDF文档',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
        ],
      },
    ]);

    const onceMessages = transformChunksToMessages(chunks2.slice(0, 5) as MessageChunk[]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
            detail: {},
            step_id: null,
            timestamp: 1759045815,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: 458,
            role: 'assistant',
            type: 'text',
            content: '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: '搜索最新的全国房价数据和市场趋势信息',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: '收集房价相关统计数据并制作图表',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: '撰写2000字的房价走势预测报告',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: '生成包含图表的PDF文档',
                        status: 'pending',
                      },
                    ],
                  },
                  id: 'call_n8w2s40hxg2rqrlrmd9bzjs1',
                  type: 'tool_call',
                },
              ],
              usage: {
                input_tokens: 4964,
                output_tokens: 134,
                total_tokens: 5098,
                input_token_details: {
                  cache_read: 0,
                },
                output_token_details: {
                  reasoning: 0,
                },
              },
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 搜索最新的全国房价数据和市场趋势信息\n2. 收集房价相关统计数据并制作图表\n3. 撰写2000字的房价走势预测报告\n4. 生成包含图表的PDF文档\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children
            children: [
              {
                id: '1',
                title: '搜索最新的全国房价数据和市场趋势信息',
                status: 'running',
                started_at: 1759045820906,
                // Add children
                children: [
                  {
                    id: 461,
                    role: 'assistant',
                    type: 'text',
                    content: '让我先搜索最新的全国房价数据和市场趋势信息。',
                    detail: {
                      run_id: '05f254a4-e8e3-475b-9b29-39c56bd1850e',
                      full_content: '让我先搜索最新的全国房价数据和市场趋势信息。',
                      tool_calls: [
                        {
                          name: 'web_search',
                          args: {
                            query: '2024-2025年全国房价走势预测 房地产市场分析',
                            query_num: 15,
                          },
                          id: 'call_dcqb8h8cgwdxts36ig37hid0',
                          type: 'tool_call',
                        },
                      ],
                      usage: {
                        input_tokens: 5178,
                        output_tokens: 42,
                        total_tokens: 5220,
                        input_token_details: {
                          cache_read: 0,
                        },
                        output_token_details: {
                          reasoning: 0,
                        },
                      },
                    },
                    step_id: '',
                    timestamp: 1759045823,
                    is_llm_message: false,
                    session_id: '0f92702c01d44411',
                    // Add isLast
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: '收集房价相关统计数据并制作图表',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '3',
                title: '撰写2000字的房价走势预测报告',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '4',
                title: '生成包含图表的PDF文档',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: '搜索最新的全国房价数据和市场趋势信息',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: '收集房价相关统计数据并制作图表',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: '撰写2000字的房价走势预测报告',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: '生成包含图表的PDF文档',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('6: add files too_call', () => {
    const stepByStepMessages = transformChunksToMessages(chunks2.slice(5, 6) as MessageChunk[], [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
            detail: {},
            step_id: null,
            timestamp: 1759045815,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: 458,
            role: 'assistant',
            type: 'text',
            content: '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: '搜索最新的全国房价数据和市场趋势信息',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: '收集房价相关统计数据并制作图表',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: '撰写2000字的房价走势预测报告',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: '生成包含图表的PDF文档',
                        status: 'pending',
                      },
                    ],
                  },
                  id: 'call_n8w2s40hxg2rqrlrmd9bzjs1',
                  type: 'tool_call',
                },
              ],
              usage: {
                input_tokens: 4964,
                output_tokens: 134,
                total_tokens: 5098,
                input_token_details: {
                  cache_read: 0,
                },
                output_token_details: {
                  reasoning: 0,
                },
              },
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 搜索最新的全国房价数据和市场趋势信息\n2. 收集房价相关统计数据并制作图表\n3. 撰写2000字的房价走势预测报告\n4. 生成包含图表的PDF文档\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children
            children: [
              {
                id: '1',
                title: '搜索最新的全国房价数据和市场趋势信息',
                status: 'running',
                started_at: 1759045820906,
                // Add children
                children: [
                  {
                    id: 461,
                    role: 'assistant',
                    type: 'text',
                    content: '让我先搜索最新的全国房价数据和市场趋势信息。',
                    detail: {
                      run_id: '05f254a4-e8e3-475b-9b29-39c56bd1850e',
                      full_content: '让我先搜索最新的全国房价数据和市场趋势信息。',
                      tool_calls: [
                        {
                          name: 'web_search',
                          args: {
                            query: '2024-2025年全国房价走势预测 房地产市场分析',
                            query_num: 15,
                          },
                          id: 'call_dcqb8h8cgwdxts36ig37hid0',
                          type: 'tool_call',
                        },
                      ],
                      usage: {
                        input_tokens: 5178,
                        output_tokens: 42,
                        total_tokens: 5220,
                        input_token_details: {
                          cache_read: 0,
                        },
                        output_token_details: {
                          reasoning: 0,
                        },
                      },
                    },
                    step_id: '',
                    timestamp: 1759045823,
                    is_llm_message: false,
                    session_id: '0f92702c01d44411',
                    // Add isLast
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: '收集房价相关统计数据并制作图表',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '3',
                title: '撰写2000字的房价走势预测报告',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '4',
                title: '生成包含图表的PDF文档',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: '搜索最新的全国房价数据和市场趋势信息',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: '收集房价相关统计数据并制作图表',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: '撰写2000字的房价走势预测报告',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: '生成包含图表的PDF文档',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
        ],
      },
    ]);

    const onceMessages = transformChunksToMessages(chunks2.slice(0, 6) as MessageChunk[]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
            detail: {},
            step_id: null,
            timestamp: 1759045815,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: 458,
            role: 'assistant',
            type: 'text',
            content: '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: '搜索最新的全国房价数据和市场趋势信息',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: '收集房价相关统计数据并制作图表',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: '撰写2000字的房价走势预测报告',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: '生成包含图表的PDF文档',
                        status: 'pending',
                      },
                    ],
                  },
                  id: 'call_n8w2s40hxg2rqrlrmd9bzjs1',
                  type: 'tool_call',
                },
              ],
              usage: {
                input_tokens: 4964,
                output_tokens: 134,
                total_tokens: 5098,
                input_token_details: {
                  cache_read: 0,
                },
                output_token_details: {
                  reasoning: 0,
                },
              },
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 搜索最新的全国房价数据和市场趋势信息\n2. 收集房价相关统计数据并制作图表\n3. 撰写2000字的房价走势预测报告\n4. 生成包含图表的PDF文档\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children
            children: [
              {
                id: '1',
                title: '搜索最新的全国房价数据和市场趋势信息',
                status: 'running',
                started_at: 1759045820906,
                // Add children
                children: [
                  {
                    id: 461,
                    role: 'assistant',
                    type: 'text',
                    content: '让我先搜索最新的全国房价数据和市场趋势信息。',
                    detail: {
                      run_id: '05f254a4-e8e3-475b-9b29-39c56bd1850e',
                      full_content: '让我先搜索最新的全国房价数据和市场趋势信息。',
                      tool_calls: [
                        {
                          name: 'web_search',
                          args: {
                            query: '2024-2025年全国房价走势预测 房地产市场分析',
                            query_num: 15,
                          },
                          id: 'call_dcqb8h8cgwdxts36ig37hid0',
                          type: 'tool_call',
                        },
                      ],
                      usage: {
                        input_tokens: 5178,
                        output_tokens: 42,
                        total_tokens: 5220,
                        input_token_details: {
                          cache_read: 0,
                        },
                        output_token_details: {
                          reasoning: 0,
                        },
                      },
                    },
                    step_id: '',
                    timestamp: 1759045823,
                    is_llm_message: false,
                    session_id: '0f92702c01d44411',
                    // Add isLast
                    isLast: true,
                  },
                  {
                    id: 538,
                    role: 'assistant',
                    // Update type
                    type: 'agent_result_delivery',
                    content: '',
                    detail: {
                      run_id: 'a3a48e81-3949-421a-a2e9-244dd3d335b6',
                      tool: 'agent_result_delivery',
                      status: 'pending',
                      param: {
                        attachments: [
                          '/workspace/全国房价走势预测报告.md',
                          '/workspace/房价走势图1.png',
                          '/workspace/房价同比变化图.png',
                          '/workspace/各线城市价格对比.png',
                        ],
                      },
                      action: '正在调用 agent_result_delivery',
                      action_content: '',
                    },
                    step_id: '',
                    timestamp: 1759046286,
                    is_llm_message: false,
                    session_id: '0f92702c01d44411',
                    // Add isLast
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: '收集房价相关统计数据并制作图表',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '3',
                title: '撰写2000字的房价走势预测报告',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '4',
                title: '生成包含图表的PDF文档',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: '搜索最新的全国房价数据和市场趋势信息',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: '收集房价相关统计数据并制作图表',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: '撰写2000字的房价走势预测报告',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: '生成包含图表的PDF文档',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });

  it('7： add files tool_result', () => {
    const stepByStepMessages = transformChunksToMessages(chunks2.slice(6, 7) as MessageChunk[], [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
            detail: {},
            step_id: null,
            timestamp: 1759045815,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: 458,
            role: 'assistant',
            type: 'text',
            content: '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: '搜索最新的全国房价数据和市场趋势信息',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: '收集房价相关统计数据并制作图表',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: '撰写2000字的房价走势预测报告',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: '生成包含图表的PDF文档',
                        status: 'pending',
                      },
                    ],
                  },
                  id: 'call_n8w2s40hxg2rqrlrmd9bzjs1',
                  type: 'tool_call',
                },
              ],
              usage: {
                input_tokens: 4964,
                output_tokens: 134,
                total_tokens: 5098,
                input_token_details: {
                  cache_read: 0,
                },
                output_token_details: {
                  reasoning: 0,
                },
              },
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 搜索最新的全国房价数据和市场趋势信息\n2. 收集房价相关统计数据并制作图表\n3. 撰写2000字的房价走势预测报告\n4. 生成包含图表的PDF文档\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children
            children: [
              {
                id: '1',
                title: '搜索最新的全国房价数据和市场趋势信息',
                status: 'running',
                started_at: 1759045820906,
                // Add children
                children: [
                  {
                    id: 461,
                    role: 'assistant',
                    type: 'text',
                    content: '让我先搜索最新的全国房价数据和市场趋势信息。',
                    detail: {
                      run_id: '05f254a4-e8e3-475b-9b29-39c56bd1850e',
                      full_content: '让我先搜索最新的全国房价数据和市场趋势信息。',
                      tool_calls: [
                        {
                          name: 'web_search',
                          args: {
                            query: '2024-2025年全国房价走势预测 房地产市场分析',
                            query_num: 15,
                          },
                          id: 'call_dcqb8h8cgwdxts36ig37hid0',
                          type: 'tool_call',
                        },
                      ],
                      usage: {
                        input_tokens: 5178,
                        output_tokens: 42,
                        total_tokens: 5220,
                        input_token_details: {
                          cache_read: 0,
                        },
                        output_token_details: {
                          reasoning: 0,
                        },
                      },
                    },
                    step_id: '',
                    timestamp: 1759045823,
                    is_llm_message: false,
                    session_id: '0f92702c01d44411',
                    // Add isLast
                    isLast: true,
                  },
                  {
                    id: 538,
                    role: 'assistant',
                    // Update type
                    type: 'agent_result_delivery',
                    content: '',
                    detail: {
                      run_id: 'a3a48e81-3949-421a-a2e9-244dd3d335b6',
                      tool: 'agent_result_delivery',
                      status: 'pending',
                      param: {
                        attachments: [
                          '/workspace/全国房价走势预测报告.md',
                          '/workspace/房价走势图1.png',
                          '/workspace/房价同比变化图.png',
                          '/workspace/各线城市价格对比.png',
                        ],
                      },
                      action: '正在调用 agent_result_delivery',
                      action_content: '',
                    },
                    step_id: '',
                    timestamp: 1759046286,
                    is_llm_message: false,
                    session_id: '0f92702c01d44411',
                    // Add isLast
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: '收集房价相关统计数据并制作图表',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '3',
                title: '撰写2000字的房价走势预测报告',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '4',
                title: '生成包含图表的PDF文档',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: '搜索最新的全国房价数据和市场趋势信息',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: '收集房价相关统计数据并制作图表',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: '撰写2000字的房价走势预测报告',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: '生成包含图表的PDF文档',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
        ],
      },
    ]);

    const onceMessages = transformChunksToMessages(chunks2.slice(0, 7) as MessageChunk[]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: '生成一个2000字的全国房价走势预测报告，要在文件中插入图表数据，最终给出pdf文档',
            detail: {},
            step_id: null,
            timestamp: 1759045815,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: 458,
            role: 'assistant',
            type: 'text',
            content: '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                '我将为您生成一份全国房价走势预测报告，包含图表数据和PDF文档。让我先制定一个详细的工作计划。',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: '搜索最新的全国房价数据和市场趋势信息',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: '收集房价相关统计数据并制作图表',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: '撰写2000字的房价走势预测报告',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: '生成包含图表的PDF文档',
                        status: 'pending',
                      },
                    ],
                  },
                  id: 'call_n8w2s40hxg2rqrlrmd9bzjs1',
                  type: 'tool_call',
                },
              ],
              usage: {
                input_tokens: 4964,
                output_tokens: 134,
                total_tokens: 5098,
                input_token_details: {
                  cache_read: 0,
                },
                output_token_details: {
                  reasoning: 0,
                },
              },
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 搜索最新的全国房价数据和市场趋势信息\n2. 收集房价相关统计数据并制作图表\n3. 撰写2000字的房价走势预测报告\n4. 生成包含图表的PDF文档\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children
            children: [
              {
                id: '1',
                title: '搜索最新的全国房价数据和市场趋势信息',
                status: 'running',
                started_at: 1759045820906,
                // Add children
                children: [
                  {
                    id: 461,
                    role: 'assistant',
                    type: 'text',
                    content: '让我先搜索最新的全国房价数据和市场趋势信息。',
                    detail: {
                      run_id: '05f254a4-e8e3-475b-9b29-39c56bd1850e',
                      full_content: '让我先搜索最新的全国房价数据和市场趋势信息。',
                      tool_calls: [
                        {
                          name: 'web_search',
                          args: {
                            query: '2024-2025年全国房价走势预测 房地产市场分析',
                            query_num: 15,
                          },
                          id: 'call_dcqb8h8cgwdxts36ig37hid0',
                          type: 'tool_call',
                        },
                      ],
                      usage: {
                        input_tokens: 5178,
                        output_tokens: 42,
                        total_tokens: 5220,
                        input_token_details: {
                          cache_read: 0,
                        },
                        output_token_details: {
                          reasoning: 0,
                        },
                      },
                    },
                    step_id: '',
                    timestamp: 1759045823,
                    is_llm_message: false,
                    session_id: '0f92702c01d44411',
                    // Add isLast
                    isLast: true,
                  },
                  {
                    id: 539,
                    role: 'assistant',
                    type: 'agent_result_delivery',
                    content: '',
                    detail: {
                      run_id: 'a3a48e81-3949-421a-a2e9-244dd3d335b6',
                      tool: 'agent_result_delivery',
                      result: {
                        additional_kwargs: {},
                        response_metadata: {},
                        type: 'tool',
                        name: 'agent_result_delivery',
                        id: null,
                        tool_call_id: 'call_uaw9w2zkncg5w67twzmi5lgs',
                        artifact: null,
                        status: 'success',
                      },
                      status: 'success',
                      attachments: [
                        {
                          filename: 'todo.md',
                          path: '',
                          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/todo.md',
                          size: 244,
                          content_type: 'application/octet-stream',
                          show_user: 0,
                        },
                        {
                          filename: '房价走势图1.png',
                          path: '/workspace/房价走势图1.png',
                          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/房价走势图1.png',
                          size: 283361,
                          content_type: 'image/png',
                          show_user: 1,
                        },
                        {
                          filename: '房价同比变化图.png',
                          path: '/workspace/房价同比变化图.png',
                          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/房价同比变化图.png',
                          size: 184938,
                          content_type: 'image/png',
                          show_user: 1,
                        },
                        {
                          filename: '各线城市价格对比.png',
                          path: '/workspace/各线城市价格对比.png',
                          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/各线城市价格对比.png',
                          size: 124350,
                          content_type: 'image/png',
                          show_user: 1,
                        },
                        {
                          filename: '全国房价走势预测报告.md',
                          path: '/workspace/全国房价走势预测报告.md',
                          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/全国房价走势预测报告.md',
                          size: 7616,
                          content_type: 'application/octet-stream',
                          show_user: 1,
                        },
                        {
                          filename: 'report_style.css',
                          path: '',
                          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/report_style.css',
                          size: 2005,
                          content_type: 'text/css',
                          show_user: 0,
                        },
                        {
                          filename: '全国房价走势预测报告.html',
                          path: '',
                          url: 'https://example.test/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/全国房价走势预测报告.html',
                          size: 9881,
                          content_type: 'text/html',
                          show_user: 0,
                        },
                      ],
                      // Keep tool_call param, action, action_content
                      param: {
                        attachments: [
                          '/workspace/全国房价走势预测报告.md',
                          '/workspace/房价走势图1.png',
                          '/workspace/房价同比变化图.png',
                          '/workspace/各线城市价格对比.png',
                        ],
                      },
                      action: '正在调用 agent_result_delivery',
                      action_content: '',
                    },
                    step_id: '',
                    timestamp: 1759046287,
                    is_llm_message: false,
                    session_id: '0f92702c01d44411',
                    // Add isLast
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: '收集房价相关统计数据并制作图表',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '3',
                title: '撰写2000字的房价走势预测报告',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
              {
                id: '4',
                title: '生成包含图表的PDF文档',
                status: 'pending',
                started_at: 1759045820906,
                // Add children
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: '搜索最新的全国房价数据和市场趋势信息',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: '收集房价相关统计数据并制作图表',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: '撰写2000字的房价走势预测报告',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: '生成包含图表的PDF文档',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });
});
