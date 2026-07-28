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
        content: 'Write a 10,000-word report analyzing the causes of nationwide housing-price fluctuations. Include charts in the report and deliver it as a PDF.',
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
            content: 'Write a 10,000-word report analyzing the causes of nationwide housing-price fluctuations. Include charts in the report and deliver it as a PDF.',
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
            'I will follow this plan:\n\n1. Gather data and sources about nationwide housing-price fluctuations\n2. Analyze the main causes and contributing factors\n3. Create charts and data visualizations\n4. Write a 10,000-word analysis report\n5. Convert the report to PDF\n\nYou can interrupt me at any time with new information or changes to the plan.',
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
              content: 'Write a 10,000-word report analyzing the causes of nationwide housing-price fluctuations. Include charts in the report and deliver it as a PDF.',
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
            content: 'Write a 10,000-word report analyzing the causes of nationwide housing-price fluctuations. Include charts in the report and deliver it as a PDF.',
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
              'I will follow this plan:\n\n1. Gather data and sources about nationwide housing-price fluctuations\n2. Analyze the main causes and contributing factors\n3. Create charts and data visualizations\n4. Write a 10,000-word analysis report\n5. Convert the report to PDF\n\nYou can interrupt me at any time with new information or changes to the plan.',
            detail: {},
            step_id: '',
            timestamp: 1758628390,
            is_llm_message: false,
            session_id: 'fc7ab6bb39d14b08',
            // Add isLast.
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
    content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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
    content: 'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
    detail: {
      run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
      full_content: 'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
      tool_calls: [
        {
          name: 'plan',
          args: {
            plans: [
              {
                id: '1',
                content: 'Search for the latest nationwide housing-price data and market trends',
                status: 'running',
              },
              {
                id: '2',
                content: 'Collect housing-price statistics and create charts',
                status: 'pending',
              },
              {
                id: '3',
                content: 'Write a 2,000-word housing-price outlook report',
                status: 'pending',
              },
              {
                id: '4',
                content: 'Generate a PDF document containing the charts',
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
      'I will follow this plan:\n\n1. Search for the latest nationwide housing-price data and market trends\n2. Collect housing-price statistics and create charts\n3. Write a 2,000-word housing-price outlook report\n4. Generate a PDF document containing the charts\n\nYou can interrupt me at any time with new information or changes to the plan.',
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
          title: 'Search for the latest nationwide housing-price data and market trends',
          status: 'running',
          started_at: 1759045820906,
        },
        {
          id: '2',
          title: 'Collect housing-price statistics and create charts',
          status: 'pending',
          started_at: 1759045820906,
        },
        {
          id: '3',
          title: 'Write a 2,000-word housing-price outlook report',
          status: 'pending',
          started_at: 1759045820906,
        },
        {
          id: '4',
          title: 'Generate a PDF document containing the charts',
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
    content: 'I will start by searching for the latest nationwide housing-price data and market trends.',
    detail: {
      run_id: '05f254a4-e8e3-475b-9b29-39c56bd1850e',
      full_content: 'I will start by searching for the latest nationwide housing-price data and market trends.',
      tool_calls: [
        {
          name: 'web_search',
          args: {
            query: '2024-2025 National Housing-Price Outlook and Real Estate Market Analysis',
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
          '/workspace/national-housing-price-outlook-report.md',
          '/workspace/housing-price-trend-1.png',
          '/workspace/year-over-year-housing-price-change.png',
          '/workspace/housing-price-comparison-by-city-tier.png',
        ],
      },
      action: 'Calling agent_result_delivery',
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
          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/todo.md',
          size: 244,
          content_type: 'application/octet-stream',
          show_user: 0,
        },
        {
          filename: 'housing-price-trend-1.png',
          path: '/workspace/housing-price-trend-1.png',
          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/housing-price-trend-1.png',
          size: 283361,
          content_type: 'image/png',
          show_user: 1,
        },
        {
          filename: 'year-over-year-housing-price-change.png',
          path: '/workspace/year-over-year-housing-price-change.png',
          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/year-over-year-housing-price-change.png',
          size: 184938,
          content_type: 'image/png',
          show_user: 1,
        },
        {
          filename: 'housing-price-comparison-by-city-tier.png',
          path: '/workspace/housing-price-comparison-by-city-tier.png',
          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/housing-price-comparison-by-city-tier.png',
          size: 124350,
          content_type: 'image/png',
          show_user: 1,
        },
        {
          filename: 'national-housing-price-outlook-report.md',
          path: '/workspace/national-housing-price-outlook-report.md',
          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/national-housing-price-outlook-report.md',
          size: 7616,
          content_type: 'application/octet-stream',
          show_user: 1,
        },
        {
          filename: 'report_style.css',
          path: '',
          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/report_style.css',
          size: 2005,
          content_type: 'text/css',
          show_user: 0,
        },
        {
          filename: 'national-housing-price-outlook-report.html',
          path: '',
          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/national-housing-price-outlook-report.html',
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
            content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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
    // Execute incrementally.
    const stepByStepMessages = transformChunksToMessages(chunks2.slice(1, 2) as MessageChunk[], [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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

    // Execute in one pass.
    const onceMessages = transformChunksToMessages(chunks2.slice(0, 2) as MessageChunk[]);

    const expectedMessages = [
      {
        role: 'user',
        messages: [
          {
            id: 457,
            role: 'user',
            type: 'text',
            content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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
            content: 'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: 'Search for the latest nationwide housing-price data and market trends',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: 'Collect housing-price statistics and create charts',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: 'Write a 2,000-word housing-price outlook report',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: 'Generate a PDF document containing the charts',
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
            // Add isLast.
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
            content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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
            content: 'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: 'Search for the latest nationwide housing-price data and market trends',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: 'Collect housing-price statistics and create charts',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: 'Write a 2,000-word housing-price outlook report',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: 'Generate a PDF document containing the charts',
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
            // Add isLast.
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
            content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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
            content: 'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: 'Search for the latest nationwide housing-price data and market trends',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: 'Collect housing-price statistics and create charts',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: 'Write a 2,000-word housing-price outlook report',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: 'Generate a PDF document containing the charts',
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
            // Add isLast.
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              'I will follow this plan:\n\n1. Search for the latest nationwide housing-price data and market trends\n2. Collect housing-price statistics and create charts\n3. Write a 2,000-word housing-price outlook report\n4. Generate a PDF document containing the charts\n\nYou can interrupt me at any time with new information or changes to the plan.',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
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
            content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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
            content: 'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: 'Search for the latest nationwide housing-price data and market trends',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: 'Collect housing-price statistics and create charts',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: 'Write a 2,000-word housing-price outlook report',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: 'Generate a PDF document containing the charts',
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
            // Add isLast.
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              'I will follow this plan:\n\n1. Search for the latest nationwide housing-price data and market trends\n2. Collect housing-price statistics and create charts\n3. Write a 2,000-word housing-price outlook report\n4. Generate a PDF document containing the charts\n\nYou can interrupt me at any time with new information or changes to the plan.',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
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
            content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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
            content: 'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: 'Search for the latest nationwide housing-price data and market trends',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: 'Collect housing-price statistics and create charts',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: 'Write a 2,000-word housing-price outlook report',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: 'Generate a PDF document containing the charts',
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
            // Add isLast.
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              'I will follow this plan:\n\n1. Search for the latest nationwide housing-price data and market trends\n2. Collect housing-price statistics and create charts\n3. Write a 2,000-word housing-price outlook report\n4. Generate a PDF document containing the charts\n\nYou can interrupt me at any time with new information or changes to the plan.',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children.
            children: [
              {
                id: '1',
                title: 'Search for the latest nationwide housing-price data and market trends',
                status: 'running',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '2',
                title: 'Collect housing-price statistics and create charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '3',
                title: 'Write a 2,000-word housing-price outlook report',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '4',
                title: 'Generate a PDF document containing the charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Search for the latest nationwide housing-price data and market trends',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: 'Collect housing-price statistics and create charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: 'Write a 2,000-word housing-price outlook report',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: 'Generate a PDF document containing the charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
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
            content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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
            content: 'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: 'Search for the latest nationwide housing-price data and market trends',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: 'Collect housing-price statistics and create charts',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: 'Write a 2,000-word housing-price outlook report',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: 'Generate a PDF document containing the charts',
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
            // Add isLast.
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              'I will follow this plan:\n\n1. Search for the latest nationwide housing-price data and market trends\n2. Collect housing-price statistics and create charts\n3. Write a 2,000-word housing-price outlook report\n4. Generate a PDF document containing the charts\n\nYou can interrupt me at any time with new information or changes to the plan.',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children.
            children: [
              {
                id: '1',
                title: 'Search for the latest nationwide housing-price data and market trends',
                status: 'running',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '2',
                title: 'Collect housing-price statistics and create charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '3',
                title: 'Write a 2,000-word housing-price outlook report',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '4',
                title: 'Generate a PDF document containing the charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Search for the latest nationwide housing-price data and market trends',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: 'Collect housing-price statistics and create charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: 'Write a 2,000-word housing-price outlook report',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: 'Generate a PDF document containing the charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
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
            content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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
            content: 'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: 'Search for the latest nationwide housing-price data and market trends',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: 'Collect housing-price statistics and create charts',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: 'Write a 2,000-word housing-price outlook report',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: 'Generate a PDF document containing the charts',
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
            // Add isLast.
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              'I will follow this plan:\n\n1. Search for the latest nationwide housing-price data and market trends\n2. Collect housing-price statistics and create charts\n3. Write a 2,000-word housing-price outlook report\n4. Generate a PDF document containing the charts\n\nYou can interrupt me at any time with new information or changes to the plan.',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children.
            children: [
              {
                id: '1',
                title: 'Search for the latest nationwide housing-price data and market trends',
                status: 'running',
                started_at: 1759045820906,
                // Add children.
                children: [
                  {
                    id: 461,
                    role: 'assistant',
                    type: 'text',
                    content: 'I will start by searching for the latest nationwide housing-price data and market trends.',
                    detail: {
                      run_id: '05f254a4-e8e3-475b-9b29-39c56bd1850e',
                      full_content: 'I will start by searching for the latest nationwide housing-price data and market trends.',
                      tool_calls: [
                        {
                          name: 'web_search',
                          args: {
                            query: '2024-2025 National Housing-Price Outlook and Real Estate Market Analysis',
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
                    // Add isLast.
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: 'Collect housing-price statistics and create charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '3',
                title: 'Write a 2,000-word housing-price outlook report',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '4',
                title: 'Generate a PDF document containing the charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Search for the latest nationwide housing-price data and market trends',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: 'Collect housing-price statistics and create charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: 'Write a 2,000-word housing-price outlook report',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: 'Generate a PDF document containing the charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
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
            content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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
            content: 'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: 'Search for the latest nationwide housing-price data and market trends',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: 'Collect housing-price statistics and create charts',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: 'Write a 2,000-word housing-price outlook report',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: 'Generate a PDF document containing the charts',
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
            // Add isLast.
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              'I will follow this plan:\n\n1. Search for the latest nationwide housing-price data and market trends\n2. Collect housing-price statistics and create charts\n3. Write a 2,000-word housing-price outlook report\n4. Generate a PDF document containing the charts\n\nYou can interrupt me at any time with new information or changes to the plan.',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children.
            children: [
              {
                id: '1',
                title: 'Search for the latest nationwide housing-price data and market trends',
                status: 'running',
                started_at: 1759045820906,
                // Add children.
                children: [
                  {
                    id: 461,
                    role: 'assistant',
                    type: 'text',
                    content: 'I will start by searching for the latest nationwide housing-price data and market trends.',
                    detail: {
                      run_id: '05f254a4-e8e3-475b-9b29-39c56bd1850e',
                      full_content: 'I will start by searching for the latest nationwide housing-price data and market trends.',
                      tool_calls: [
                        {
                          name: 'web_search',
                          args: {
                            query: '2024-2025 National Housing-Price Outlook and Real Estate Market Analysis',
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
                    // Add isLast.
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: 'Collect housing-price statistics and create charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '3',
                title: 'Write a 2,000-word housing-price outlook report',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '4',
                title: 'Generate a PDF document containing the charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Search for the latest nationwide housing-price data and market trends',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: 'Collect housing-price statistics and create charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: 'Write a 2,000-word housing-price outlook report',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: 'Generate a PDF document containing the charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
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
            content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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
            content: 'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: 'Search for the latest nationwide housing-price data and market trends',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: 'Collect housing-price statistics and create charts',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: 'Write a 2,000-word housing-price outlook report',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: 'Generate a PDF document containing the charts',
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
            // Add isLast.
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              'I will follow this plan:\n\n1. Search for the latest nationwide housing-price data and market trends\n2. Collect housing-price statistics and create charts\n3. Write a 2,000-word housing-price outlook report\n4. Generate a PDF document containing the charts\n\nYou can interrupt me at any time with new information or changes to the plan.',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children.
            children: [
              {
                id: '1',
                title: 'Search for the latest nationwide housing-price data and market trends',
                status: 'running',
                started_at: 1759045820906,
                // Add children.
                children: [
                  {
                    id: 461,
                    role: 'assistant',
                    type: 'text',
                    content: 'I will start by searching for the latest nationwide housing-price data and market trends.',
                    detail: {
                      run_id: '05f254a4-e8e3-475b-9b29-39c56bd1850e',
                      full_content: 'I will start by searching for the latest nationwide housing-price data and market trends.',
                      tool_calls: [
                        {
                          name: 'web_search',
                          args: {
                            query: '2024-2025 National Housing-Price Outlook and Real Estate Market Analysis',
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
                    // Add isLast.
                    isLast: true,
                  },
                  {
                    id: 538,
                    role: 'assistant',
                    // Update type.
                    type: 'agent_result_delivery',
                    content: '',
                    detail: {
                      run_id: 'a3a48e81-3949-421a-a2e9-244dd3d335b6',
                      tool: 'agent_result_delivery',
                      status: 'pending',
                      param: {
                        attachments: [
                          '/workspace/national-housing-price-outlook-report.md',
                          '/workspace/housing-price-trend-1.png',
                          '/workspace/year-over-year-housing-price-change.png',
                          '/workspace/housing-price-comparison-by-city-tier.png',
                        ],
                      },
                      action: 'Calling agent_result_delivery',
                      action_content: '',
                    },
                    step_id: '',
                    timestamp: 1759046286,
                    is_llm_message: false,
                    session_id: '0f92702c01d44411',
                    // Add isLast.
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: 'Collect housing-price statistics and create charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '3',
                title: 'Write a 2,000-word housing-price outlook report',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '4',
                title: 'Generate a PDF document containing the charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Search for the latest nationwide housing-price data and market trends',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: 'Collect housing-price statistics and create charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: 'Write a 2,000-word housing-price outlook report',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: 'Generate a PDF document containing the charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
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
            content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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
            content: 'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: 'Search for the latest nationwide housing-price data and market trends',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: 'Collect housing-price statistics and create charts',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: 'Write a 2,000-word housing-price outlook report',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: 'Generate a PDF document containing the charts',
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
            // Add isLast.
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              'I will follow this plan:\n\n1. Search for the latest nationwide housing-price data and market trends\n2. Collect housing-price statistics and create charts\n3. Write a 2,000-word housing-price outlook report\n4. Generate a PDF document containing the charts\n\nYou can interrupt me at any time with new information or changes to the plan.',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children.
            children: [
              {
                id: '1',
                title: 'Search for the latest nationwide housing-price data and market trends',
                status: 'running',
                started_at: 1759045820906,
                // Add children.
                children: [
                  {
                    id: 461,
                    role: 'assistant',
                    type: 'text',
                    content: 'I will start by searching for the latest nationwide housing-price data and market trends.',
                    detail: {
                      run_id: '05f254a4-e8e3-475b-9b29-39c56bd1850e',
                      full_content: 'I will start by searching for the latest nationwide housing-price data and market trends.',
                      tool_calls: [
                        {
                          name: 'web_search',
                          args: {
                            query: '2024-2025 National Housing-Price Outlook and Real Estate Market Analysis',
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
                    // Add isLast.
                    isLast: true,
                  },
                  {
                    id: 538,
                    role: 'assistant',
                    // Update type.
                    type: 'agent_result_delivery',
                    content: '',
                    detail: {
                      run_id: 'a3a48e81-3949-421a-a2e9-244dd3d335b6',
                      tool: 'agent_result_delivery',
                      status: 'pending',
                      param: {
                        attachments: [
                          '/workspace/national-housing-price-outlook-report.md',
                          '/workspace/housing-price-trend-1.png',
                          '/workspace/year-over-year-housing-price-change.png',
                          '/workspace/housing-price-comparison-by-city-tier.png',
                        ],
                      },
                      action: 'Calling agent_result_delivery',
                      action_content: '',
                    },
                    step_id: '',
                    timestamp: 1759046286,
                    is_llm_message: false,
                    session_id: '0f92702c01d44411',
                    // Add isLast.
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: 'Collect housing-price statistics and create charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '3',
                title: 'Write a 2,000-word housing-price outlook report',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '4',
                title: 'Generate a PDF document containing the charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Search for the latest nationwide housing-price data and market trends',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: 'Collect housing-price statistics and create charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: 'Write a 2,000-word housing-price outlook report',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: 'Generate a PDF document containing the charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
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
            content: 'Create a 2,000-word nationwide housing-price outlook report. Include chart data and deliver the final document as a PDF.',
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
            content: 'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
            detail: {
              run_id: '676cd598-ad6b-4b7d-baee-ffc9c9fbf819',
              full_content:
                'I will create a nationwide housing-price outlook report with charts and a PDF document. I will start by preparing a detailed plan.',
              tool_calls: [
                {
                  name: 'plan',
                  args: {
                    plans: [
                      {
                        id: '1',
                        content: 'Search for the latest nationwide housing-price data and market trends',
                        status: 'running',
                      },
                      {
                        id: '2',
                        content: 'Collect housing-price statistics and create charts',
                        status: 'pending',
                      },
                      {
                        id: '3',
                        content: 'Write a 2,000-word housing-price outlook report',
                        status: 'pending',
                      },
                      {
                        id: '4',
                        content: 'Generate a PDF document containing the charts',
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
            // Add isLast.
            isLast: true,
          },
          {
            id: 459,
            role: 'assistant',
            type: 'text',
            content:
              'I will follow this plan:\n\n1. Search for the latest nationwide housing-price data and market trends\n2. Collect housing-price statistics and create charts\n3. Write a 2,000-word housing-price outlook report\n4. Generate a PDF document containing the charts\n\nYou can interrupt me at any time with new information or changes to the plan.',
            detail: {},
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
            isLast: true,
          },
          {
            id: 460,
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children.
            children: [
              {
                id: '1',
                title: 'Search for the latest nationwide housing-price data and market trends',
                status: 'running',
                started_at: 1759045820906,
                // Add children.
                children: [
                  {
                    id: 461,
                    role: 'assistant',
                    type: 'text',
                    content: 'I will start by searching for the latest nationwide housing-price data and market trends.',
                    detail: {
                      run_id: '05f254a4-e8e3-475b-9b29-39c56bd1850e',
                      full_content: 'I will start by searching for the latest nationwide housing-price data and market trends.',
                      tool_calls: [
                        {
                          name: 'web_search',
                          args: {
                            query: '2024-2025 National Housing-Price Outlook and Real Estate Market Analysis',
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
                    // Add isLast.
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
                          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/todo.md',
                          size: 244,
                          content_type: 'application/octet-stream',
                          show_user: 0,
                        },
                        {
                          filename: 'housing-price-trend-1.png',
                          path: '/workspace/housing-price-trend-1.png',
                          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/housing-price-trend-1.png',
                          size: 283361,
                          content_type: 'image/png',
                          show_user: 1,
                        },
                        {
                          filename: 'year-over-year-housing-price-change.png',
                          path: '/workspace/year-over-year-housing-price-change.png',
                          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/year-over-year-housing-price-change.png',
                          size: 184938,
                          content_type: 'image/png',
                          show_user: 1,
                        },
                        {
                          filename: 'housing-price-comparison-by-city-tier.png',
                          path: '/workspace/housing-price-comparison-by-city-tier.png',
                          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/housing-price-comparison-by-city-tier.png',
                          size: 124350,
                          content_type: 'image/png',
                          show_user: 1,
                        },
                        {
                          filename: 'national-housing-price-outlook-report.md',
                          path: '/workspace/national-housing-price-outlook-report.md',
                          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/national-housing-price-outlook-report.md',
                          size: 7616,
                          content_type: 'application/octet-stream',
                          show_user: 1,
                        },
                        {
                          filename: 'report_style.css',
                          path: '',
                          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/report_style.css',
                          size: 2005,
                          content_type: 'text/css',
                          show_user: 0,
                        },
                        {
                          filename: 'national-housing-price-outlook-report.html',
                          path: '',
                          url: 'https://test-app.lingyiwanwu.net/boway/sandbox/ibtfuuv0rnb0p4r7ipdso-ecc9fd8d/user_attachments/national-housing-price-outlook-report.html',
                          size: 9881,
                          content_type: 'text/html',
                          show_user: 0,
                        },
                      ],
                      // Preserve param, action, and action_content from tool_call.
                      param: {
                        attachments: [
                          '/workspace/national-housing-price-outlook-report.md',
                          '/workspace/housing-price-trend-1.png',
                          '/workspace/year-over-year-housing-price-change.png',
                          '/workspace/housing-price-comparison-by-city-tier.png',
                        ],
                      },
                      action: 'Calling agent_result_delivery',
                      action_content: '',
                    },
                    step_id: '',
                    timestamp: 1759046287,
                    is_llm_message: false,
                    session_id: '0f92702c01d44411',
                    // Add isLast.
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: 'Collect housing-price statistics and create charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '3',
                title: 'Write a 2,000-word housing-price outlook report',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
              {
                id: '4',
                title: 'Generate a PDF document containing the charts',
                status: 'pending',
                started_at: 1759045820906,
                // Add children.
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Search for the latest nationwide housing-price data and market trends',
                  status: 'running',
                  started_at: 1759045820906,
                },
                {
                  id: '2',
                  title: 'Collect housing-price statistics and create charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '3',
                  title: 'Write a 2,000-word housing-price outlook report',
                  status: 'pending',
                  started_at: 1759045820906,
                },
                {
                  id: '4',
                  title: 'Generate a PDF document containing the charts',
                  status: 'pending',
                  started_at: 1759045820906,
                },
              ],
            },
            step_id: '',
            timestamp: 1759045820,
            is_llm_message: false,
            session_id: '0f92702c01d44411',
            // Add isLast.
            isLast: true,
          },
        ],
      },
    ];

    expect(stepByStepMessages).toEqual(expectedMessages);
    expect(onceMessages).toEqual(expectedMessages);
  });
});
