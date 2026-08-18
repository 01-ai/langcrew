import { describe, it, expect } from 'vitest';
import { getLoadingMessage } from '../../utils';
import { transformChunksToMessages } from '../../transformChunksToMessages';

describe('transformChunksToMessages', () => {
  it('1', () => {
    const messages = transformChunksToMessages([
      {
        id: '1758111821217_b6ebc8f6',
        role: 'user',
        type: 'text',
        content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
        detail: {},
        timestamp: 1758111821217,
      },
    ]);
    expect(messages).toEqual([
      {
        role: 'user',
        messages: [
          {
            id: '1758111821217_b6ebc8f6',
            role: 'user',
            type: 'text',
            content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
            detail: {},
            timestamp: 1758111821217,
          },
        ],
      },
      // Add loadingMessage
      getLoadingMessage(),
    ]);
  });

  it('2', () => {
    const messages = transformChunksToMessages(
      [
        {
          id: '1758111825367_hao1',
          role: 'assistant',
          type: 'text',
          content:
            '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
          detail: {},
          timestamp: 1758111825386,
        },
      ],
      [
        {
          role: 'user',
          messages: [
            {
              id: '1758111821217_b6ebc8f6',
              role: 'user',
              type: 'text',
              content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
              detail: {},
              timestamp: 1758111821217,
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
            id: '1758111821217_b6ebc8f6',
            role: 'user',
            type: 'text',
            content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
            detail: {},
            timestamp: 1758111821217,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1758111825367_hao1',
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1758111825386,
            // Add isLast
            isLast: true,
          },
        ],
      },
    ]);
  });

  it('3', () => {
    const messages = transformChunksToMessages(
      [
        {
          id: '1758111825367_zpxp',
          role: 'assistant',
          type: 'plan',
          content: '',
          detail: {
            steps: [
              {
                id: '1',
                title: '使用browser-use查询北京本周天气预报信息',
                status: 'running',
                started_at: 1758111825367,
              },
              {
                id: '2',
                title:
                  '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                status: 'pending',
                started_at: 1758111825367,
              },
            ],
          },
          timestamp: 1758111825422,
        },
      ],
      [
        {
          role: 'user',
          messages: [
            {
              id: '1758111821217_b6ebc8f6',
              role: 'user',
              type: 'text',
              content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
              detail: {},
              timestamp: 1758111821217,
            },
          ],
        },
        {
          role: 'assistant',
          messages: [
            {
              id: '1758111825367_hao1',
              role: 'assistant',
              type: 'text',
              content:
                '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
              detail: {},
              timestamp: 1758111825386,
              isLast: true,
            },
          ],
        },
      ],
    );

    expect(messages).toEqual([
      {
        role: 'user',
        messages: [
          {
            id: '1758111821217_b6ebc8f6',
            role: 'user',
            type: 'text',
            content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
            detail: {},
            timestamp: 1758111821217,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1758111825367_hao1',
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1758111825386,
            // Add isLast
            isLast: true,
          },
          {
            id: '1758111825367_zpxp',
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children
            children: [
              {
                id: '1',
                title: '使用browser-use查询北京本周天气预报信息',
                status: 'running',
                started_at: 1758111825367,
                // Add children
                children: [],
              },
              {
                id: '2',
                title:
                  '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                status: 'pending',
                started_at: 1758111825367,
                // Add children
                children: [],
              },
            ],

            detail: {
              steps: [
                {
                  id: '1',
                  title: '使用browser-use查询北京本周天气预报信息',
                  status: 'running',
                  started_at: 1758111825367,
                },
                {
                  id: '2',
                  title:
                    '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                  status: 'pending',
                  started_at: 1758111825367,
                },
              ],
            },
            timestamp: 1758111825422,
            // Add isLast
            isLast: true,
          },
        ],
      },
    ]);
  });

  it('4', () => {
    const messages = transformChunksToMessages(
      [
        {
          id: '1758111827607_t0so',
          role: 'inner_message',
          type: 'config',
          content: 'update_session',
          detail: {
            session_id: 'daeb61e93f7d4326',
            sandbox_id: 'i1hvw3ir6vka66ru4ztu0-ecc9fd8d',
            sandbox_url: '',
          },
          timestamp: 1758111827661,
        },
      ],
      [
        {
          role: 'user',
          messages: [
            {
              id: '1758111821217_b6ebc8f6',
              role: 'user',
              type: 'text',
              content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
              detail: {},
              timestamp: 1758111821217,
            },
          ],
        },
        {
          role: 'assistant',
          messages: [
            {
              id: '1758111825367_hao1',
              role: 'assistant',
              type: 'text',
              content:
                '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
              detail: {},
              timestamp: 1758111825386,
              // Add isLast
              isLast: true,
            },
            {
              id: '1758111825367_zpxp',
              role: 'assistant',
              type: 'plan',
              content: '',
              // Add children
              children: [
                {
                  id: '1',
                  title: '使用browser-use查询北京本周天气预报信息',
                  status: 'running',
                  started_at: 1758111825367,
                  // Add children
                  children: [],
                },
                {
                  id: '2',
                  title:
                    '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                  status: 'pending',
                  started_at: 1758111825367,
                  // Add children
                  children: [],
                },
              ],

              detail: {
                steps: [
                  {
                    id: '1',
                    title: '使用browser-use查询北京本周天气预报信息',
                    status: 'running',
                    started_at: 1758111825367,
                  },
                  {
                    id: '2',
                    title:
                      '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                    status: 'pending',
                    started_at: 1758111825367,
                  },
                ],
              },
              timestamp: 1758111825422,
              // Add isLast
              isLast: true,
            },
          ],
        },
      ],
    );

    expect(messages).toEqual([
      {
        role: 'user',
        messages: [
          {
            id: '1758111821217_b6ebc8f6',
            role: 'user',
            type: 'text',
            content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
            detail: {},
            timestamp: 1758111821217,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1758111825367_hao1',
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1758111825386,
            // Add isLast
            isLast: true,
          },
          {
            id: '1758111825367_zpxp',
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children
            children: [
              {
                id: '1',
                title: '使用browser-use查询北京本周天气预报信息',
                status: 'running',
                started_at: 1758111825367,
                // Add children
                children: [],
              },
              {
                id: '2',
                title:
                  '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                status: 'pending',
                started_at: 1758111825367,
                // Add children
                children: [],
              },
            ],

            detail: {
              steps: [
                {
                  id: '1',
                  title: '使用browser-use查询北京本周天气预报信息',
                  status: 'running',
                  started_at: 1758111825367,
                },
                {
                  id: '2',
                  title:
                    '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                  status: 'pending',
                  started_at: 1758111825367,
                },
              ],
            },
            timestamp: 1758111825422,
            // Add isLast
            isLast: true,
          },
        ],
      },
    ]);
  });

  it('5', () => {
    const messages = transformChunksToMessages(
      [
        {
          id: '1758111827825_1b8b',
          role: 'assistant',
          type: 'tool_call',
          content: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
          detail: {
            run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
            tool: 'browser-use',
            status: 'pending',
            param: {
              sandbox_url:
                'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
              brief: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
              timestamp_ns: 1758111827825830400,
            },
            action: '正在调用 browser-use',
            action_content: '',
          },
          timestamp: 1758111827942,
        },
      ],
      [
        {
          role: 'user',
          messages: [
            {
              id: '1758111821217_b6ebc8f6',
              role: 'user',
              type: 'text',
              content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
              detail: {},
              timestamp: 1758111821217,
            },
          ],
        },
        {
          role: 'assistant',
          messages: [
            {
              id: '1758111825367_hao1',
              role: 'assistant',
              type: 'text',
              content:
                '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
              detail: {},
              timestamp: 1758111825386,
              // Add isLast
              isLast: true,
            },
            {
              id: '1758111825367_zpxp',
              role: 'assistant',
              type: 'plan',
              content: '',
              // Add children
              children: [
                {
                  id: '1',
                  title: '使用browser-use查询北京本周天气预报信息',
                  status: 'running',
                  started_at: 1758111825367,
                  // Add children
                  children: [],
                },
                {
                  id: '2',
                  title:
                    '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                  status: 'pending',
                  started_at: 1758111825367,
                  // Add children
                  children: [],
                },
              ],

              detail: {
                steps: [
                  {
                    id: '1',
                    title: '使用browser-use查询北京本周天气预报信息',
                    status: 'running',
                    started_at: 1758111825367,
                  },
                  {
                    id: '2',
                    title:
                      '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                    status: 'pending',
                    started_at: 1758111825367,
                  },
                ],
              },
              timestamp: 1758111825422,
              // Add isLast
              isLast: true,
            },
          ],
        },
      ],
    );

    expect(messages).toEqual([
      {
        role: 'user',
        messages: [
          {
            id: '1758111821217_b6ebc8f6',
            role: 'user',
            type: 'text',
            content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
            detail: {},
            timestamp: 1758111821217,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1758111825367_hao1',
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1758111825386,
            // Add isLast
            isLast: true,
          },
          {
            id: '1758111825367_zpxp',
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children
            children: [
              {
                id: '1',
                title: '使用browser-use查询北京本周天气预报信息',
                status: 'running',
                started_at: 1758111825367,
                // Add children
                children: [
                  {
                    id: '1758111827825_1b8b',
                    role: 'assistant',
                    // type becomes the tool name
                    type: 'browser-use',
                    content: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                    detail: {
                      run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                      tool: 'browser-use',
                      status: 'pending',
                      param: {
                        sandbox_url:
                          'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                        brief: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                        timestamp_ns: 1758111827825830400,
                      },
                      action: '正在调用 browser-use',
                      action_content: '',
                    },
                    timestamp: 1758111827942,
                    // Add isLast
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title:
                  '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                status: 'pending',
                started_at: 1758111825367,
                // Add children
                children: [],
              },
            ],

            detail: {
              steps: [
                {
                  id: '1',
                  title: '使用browser-use查询北京本周天气预报信息',
                  status: 'running',
                  started_at: 1758111825367,
                },
                {
                  id: '2',
                  title:
                    '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                  status: 'pending',
                  started_at: 1758111825367,
                },
              ],
            },
            timestamp: 1758111825422,
            // Add isLast
            isLast: true,
          },
        ],
      },
    ]);
  });

  it('6', () => {
    const messages = transformChunksToMessages(
      [
        {
          id: '1758111833950_1a98',
          role: 'assistant',
          type: 'tool_result',
          content: '',
          detail: {
            run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
            tool: 'browser-use',
            result: {
              url: '',
              title: '',
              image_url:
                'https://example.test/boway/sandbox/i1hvw3ir6vka66ru4ztu0-ecc9fd8d/images/c5b54a1d269b3db4f698318bd72e2356.png',
              final_result: '',
              timestamp_ns: 1758111833950838300,
              sandbox_url:
                'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
            },
            status: 'success',
          },
          timestamp: 1758111833961,
        },
      ],
      [
        {
          role: 'user',
          messages: [
            {
              id: '1758111821217_b6ebc8f6',
              role: 'user',
              type: 'text',
              content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
              detail: {},
              timestamp: 1758111821217,
            },
          ],
        },
        {
          role: 'assistant',
          messages: [
            {
              id: '1758111825367_hao1',
              role: 'assistant',
              type: 'text',
              content:
                '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
              detail: {},
              timestamp: 1758111825386,
              // Add isLast
              isLast: true,
            },
            {
              id: '1758111825367_zpxp',
              role: 'assistant',
              type: 'plan',
              content: '',
              // Add children
              children: [
                {
                  id: '1',
                  title: '使用browser-use查询北京本周天气预报信息',
                  status: 'running',
                  started_at: 1758111825367,
                  // Add children
                  children: [
                    {
                      id: '1758111827825_1b8b',
                      role: 'assistant',
                      // type becomes the tool name
                      type: 'browser-use',
                      content: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                      detail: {
                        run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                        tool: 'browser-use',
                        status: 'pending',
                        param: {
                          sandbox_url:
                            'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                          brief: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                          timestamp_ns: 1758111827825830400,
                        },
                        action: '正在调用 browser-use',
                        action_content: '',
                      },
                      timestamp: 1758111827942,
                      // Add isLast
                      isLast: true,
                    },
                  ],
                },
                {
                  id: '2',
                  title:
                    '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                  status: 'pending',
                  started_at: 1758111825367,
                  // Add children
                  children: [],
                },
              ],

              detail: {
                steps: [
                  {
                    id: '1',
                    title: '使用browser-use查询北京本周天气预报信息',
                    status: 'running',
                    started_at: 1758111825367,
                  },
                  {
                    id: '2',
                    title:
                      '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                    status: 'pending',
                    started_at: 1758111825367,
                  },
                ],
              },
              timestamp: 1758111825422,
              // Add isLast
              isLast: true,
            },
          ],
        },
      ],
    );

    expect(messages).toEqual([
      {
        role: 'user',
        messages: [
          {
            id: '1758111821217_b6ebc8f6',
            role: 'user',
            type: 'text',
            content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
            detail: {},
            timestamp: 1758111821217,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1758111825367_hao1',
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1758111825386,
            // Add isLast
            isLast: true,
          },
          {
            id: '1758111825367_zpxp',
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children
            children: [
              {
                id: '1',
                title: '使用browser-use查询北京本周天气预报信息',
                status: 'running',
                started_at: 1758111825367,
                // Add children
                children: [
                  {
                    id: '1758111833950_1a98',
                    role: 'assistant',
                    // type becomes the tool name
                    type: 'browser-use',
                    content: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                    detail: {
                      param: {
                        sandbox_url:
                          'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                        brief: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                        timestamp_ns: 1758111827825830400,
                      },
                      action: '正在调用 browser-use',
                      action_content: '',

                      run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                      tool: 'browser-use',
                      result: {
                        url: '',
                        title: '',
                        image_url:
                          'https://example.test/boway/sandbox/i1hvw3ir6vka66ru4ztu0-ecc9fd8d/images/c5b54a1d269b3db4f698318bd72e2356.png',
                        final_result: '',
                        timestamp_ns: 1758111833950838300,
                        sandbox_url:
                          'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                      },
                      status: 'success',
                    },
                    timestamp: 1758111833961,
                    // Add isLast
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title:
                  '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                status: 'pending',
                started_at: 1758111825367,
                // Add children
                children: [],
              },
            ],

            detail: {
              steps: [
                {
                  id: '1',
                  title: '使用browser-use查询北京本周天气预报信息',
                  status: 'running',
                  started_at: 1758111825367,
                },
                {
                  id: '2',
                  title:
                    '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                  status: 'pending',
                  started_at: 1758111825367,
                },
              ],
            },
            timestamp: 1758111825422,
            // Add isLast
            isLast: true,
          },
        ],
      },
    ]);
  });

  it('7', () => {
    const messages = transformChunksToMessages(
      [
        {
          id: '1758111833974_8doh',
          role: 'assistant',
          type: 'tool_call',
          content: '在新标签页中打开百度首页（https://www.baidu.com）。',
          detail: {
            run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
            tool: 'browser-use',
            status: 'pending',
            param: {
              sandbox_url:
                'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
              brief: '在新标签页中打开百度首页（https://www.baidu.com）。',
              timestamp_ns: 1758111833950847500,
            },
            action: '正在调用 browser-use',
            action_content: '',
          },
          timestamp: 1758111833984,
        },
      ],
      [
        {
          role: 'user',
          messages: [
            {
              id: '1758111821217_b6ebc8f6',
              role: 'user',
              type: 'text',
              content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
              detail: {},
              timestamp: 1758111821217,
            },
          ],
        },
        {
          role: 'assistant',
          messages: [
            {
              id: '1758111825367_hao1',
              role: 'assistant',
              type: 'text',
              content:
                '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
              detail: {},
              timestamp: 1758111825386,
              // Add isLast
              isLast: true,
            },
            {
              id: '1758111825367_zpxp',
              role: 'assistant',
              type: 'plan',
              content: '',
              // Add children
              children: [
                {
                  id: '1',
                  title: '使用browser-use查询北京本周天气预报信息',
                  status: 'running',
                  started_at: 1758111825367,
                  // Add children
                  children: [
                    {
                      id: '1758111833950_1a98',
                      role: 'assistant',
                      // type becomes the tool name
                      type: 'browser-use',
                      content: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                      detail: {
                        run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                        tool: 'browser-use',
                        status: 'success',
                        param: {
                          sandbox_url:
                            'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                          brief: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                          timestamp_ns: 1758111827825830400,
                        },
                        action: '正在调用 browser-use',
                        action_content: '',
                        result: {
                          url: '',
                          title: '',
                          image_url:
                            'https://example.test/boway/sandbox/i1hvw3ir6vka66ru4ztu0-ecc9fd8d/images/c5b54a1d269b3db4f698318bd72e2356.png',
                          final_result: '',
                          timestamp_ns: 1758111833950838300,
                          sandbox_url:
                            'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                        },
                      },
                      timestamp: 1758111827942,
                      // Add isLast
                      isLast: true,
                    },
                  ],
                },
                {
                  id: '2',
                  title:
                    '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                  status: 'pending',
                  started_at: 1758111825367,
                  // Add children
                  children: [],
                },
              ],

              detail: {
                steps: [
                  {
                    id: '1',
                    title: '使用browser-use查询北京本周天气预报信息',
                    status: 'running',
                    started_at: 1758111825367,
                  },
                  {
                    id: '2',
                    title:
                      '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                    status: 'pending',
                    started_at: 1758111825367,
                  },
                ],
              },
              timestamp: 1758111825422,
              // Add isLast
              isLast: true,
            },
          ],
        },
      ],
    );

    expect(messages).toEqual([
      {
        role: 'user',
        messages: [
          {
            id: '1758111821217_b6ebc8f6',
            role: 'user',
            type: 'text',
            content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
            detail: {},
            timestamp: 1758111821217,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1758111825367_hao1',
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1758111825386,
            // Add isLast
            isLast: true,
          },
          {
            id: '1758111825367_zpxp',
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children
            children: [
              {
                id: '1',
                title: '使用browser-use查询北京本周天气预报信息',
                status: 'running',
                started_at: 1758111825367,
                // Add children
                children: [
                  {
                    id: '1758111833950_1a98',
                    role: 'assistant',
                    // type becomes the tool name
                    type: 'browser-use',
                    content: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                    detail: {
                      run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                      tool: 'browser-use',
                      status: 'success',
                      param: {
                        sandbox_url:
                          'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                        brief: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                        timestamp_ns: 1758111827825830400,
                      },
                      action: '正在调用 browser-use',
                      action_content: '',
                      result: {
                        url: '',
                        title: '',
                        image_url:
                          'https://example.test/boway/sandbox/i1hvw3ir6vka66ru4ztu0-ecc9fd8d/images/c5b54a1d269b3db4f698318bd72e2356.png',
                        final_result: '',
                        timestamp_ns: 1758111833950838300,
                        sandbox_url:
                          'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                      },
                    },
                    timestamp: 1758111827942,
                    // Add isLast
                    isLast: true,
                  },
                  {
                    id: '1758111833974_8doh',
                    role: 'assistant',
                    // type becomes the tool name
                    type: 'browser-use',
                    content: '在新标签页中打开百度首页（https://www.baidu.com）。',
                    detail: {
                      run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                      tool: 'browser-use',
                      status: 'pending',
                      param: {
                        sandbox_url:
                          'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                        brief: '在新标签页中打开百度首页（https://www.baidu.com）。',
                        timestamp_ns: 1758111833950847500,
                      },
                      action: '正在调用 browser-use',
                      action_content: '',
                    },
                    timestamp: 1758111833984,
                    // Add isLast
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title:
                  '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                status: 'pending',
                started_at: 1758111825367,
                // Add children
                children: [],
              },
            ],

            detail: {
              steps: [
                {
                  id: '1',
                  title: '使用browser-use查询北京本周天气预报信息',
                  status: 'running',
                  started_at: 1758111825367,
                },
                {
                  id: '2',
                  title:
                    '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                  status: 'pending',
                  started_at: 1758111825367,
                },
              ],
            },
            timestamp: 1758111825422,
            // Add isLast
            isLast: true,
          },
        ],
      },
    ]);
  });

  it('8', () => {
    const messages = transformChunksToMessages(
      [
        {
          id: '1758111849971_az9o',
          role: 'assistant',
          type: 'tool_result',
          content: '',
          detail: {
            run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
            tool: 'browser-use',
            result: {
              url: 'https://www.baidu.com/',
              title: '百度一下，你就知道',
              image_url:
                'https://example.test/boway/sandbox/i1hvw3ir6vka66ru4ztu0-ecc9fd8d/images/aad692b4160a951336667b00cc608a18.png',
              final_result: '',
              timestamp_ns: 1758111849971686000,
              sandbox_url:
                'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
            },
            status: 'success',
          },
          timestamp: 1758111849984,
        },
      ],
      [
        {
          role: 'user',
          messages: [
            {
              id: '1758111821217_b6ebc8f6',
              role: 'user',
              type: 'text',
              content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
              detail: {},
              timestamp: 1758111821217,
            },
          ],
        },
        {
          role: 'assistant',
          messages: [
            {
              id: '1758111825367_hao1',
              role: 'assistant',
              type: 'text',
              content:
                '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
              detail: {},
              timestamp: 1758111825386,
              // Add isLast
              isLast: true,
            },
            {
              id: '1758111825367_zpxp',
              role: 'assistant',
              type: 'plan',
              content: '',
              // Add children
              children: [
                {
                  id: '1',
                  title: '使用browser-use查询北京本周天气预报信息',
                  status: 'running',
                  started_at: 1758111825367,
                  // Add children
                  children: [
                    {
                      id: '1758111833950_1a98',
                      role: 'assistant',
                      // type becomes the tool name
                      type: 'browser-use',
                      content: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                      detail: {
                        run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                        tool: 'browser-use',
                        status: 'success',
                        param: {
                          sandbox_url:
                            'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                          brief: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                          timestamp_ns: 1758111827825830400,
                        },
                        action: '正在调用 browser-use',
                        action_content: '',
                        result: {
                          url: '',
                          title: '',
                          image_url:
                            'https://example.test/boway/sandbox/i1hvw3ir6vka66ru4ztu0-ecc9fd8d/images/c5b54a1d269b3db4f698318bd72e2356.png',
                          final_result: '',
                          timestamp_ns: 1758111833950838300,
                          sandbox_url:
                            'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                        },
                      },
                      timestamp: 1758111827942,
                      // Add isLast
                      isLast: true,
                    },
                    {
                      id: '1758111833974_8doh',
                      role: 'assistant',
                      // type becomes the tool name
                      type: 'browser-use',
                      content: '在新标签页中打开百度首页（https://www.baidu.com）。',
                      detail: {
                        run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                        tool: 'browser-use',
                        status: 'pending',
                        param: {
                          sandbox_url:
                            'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                          brief: '在新标签页中打开百度首页（https://www.baidu.com）。',
                          timestamp_ns: 1758111833950847500,
                        },
                        action: '正在调用 browser-use',
                        action_content: '',
                      },
                      timestamp: 1758111833984,
                      // Add isLast
                      isLast: true,
                    },
                  ],
                },
                {
                  id: '2',
                  title:
                    '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                  status: 'pending',
                  started_at: 1758111825367,
                  // Add children
                  children: [],
                },
              ],

              detail: {
                steps: [
                  {
                    id: '1',
                    title: '使用browser-use查询北京本周天气预报信息',
                    status: 'running',
                    started_at: 1758111825367,
                  },
                  {
                    id: '2',
                    title:
                      '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                    status: 'pending',
                    started_at: 1758111825367,
                  },
                ],
              },
              timestamp: 1758111825422,
              // Add isLast
              isLast: true,
            },
          ],
        },
      ],
    );

    expect(messages).toEqual([
      {
        role: 'user',
        messages: [
          {
            id: '1758111821217_b6ebc8f6',
            role: 'user',
            type: 'text',
            content: '再用plan工具规划，使用browser-use 查询北京天气，帮我规划一下本周通勤方式\n\n',
            detail: {},
            timestamp: 1758111821217,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1758111825367_hao1',
            role: 'assistant',
            type: 'text',
            content:
              '我将按照下列计划进行工作：\n\n1. 使用browser-use查询北京本周天气预报信息\n2. 根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1758111825386,
            // Add isLast
            isLast: true,
          },
          {
            id: '1758111825367_zpxp',
            role: 'assistant',
            type: 'plan',
            content: '',
            // Add children
            children: [
              {
                id: '1',
                title: '使用browser-use查询北京本周天气预报信息',
                status: 'running',
                started_at: 1758111825367,
                // Add children
                children: [
                  {
                    id: '1758111833950_1a98',
                    role: 'assistant',
                    // type becomes the tool name
                    type: 'browser-use',
                    content: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                    detail: {
                      run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                      tool: 'browser-use',
                      status: 'success',
                      param: {
                        sandbox_url:
                          'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                        brief: '打开百度，搜索“北京本周天气预报”，获取未来7天天气信息，包括温度、降雨、风力等。',
                        timestamp_ns: 1758111827825830400,
                      },
                      action: '正在调用 browser-use',
                      action_content: '',
                      result: {
                        url: '',
                        title: '',
                        image_url:
                          'https://example.test/boway/sandbox/i1hvw3ir6vka66ru4ztu0-ecc9fd8d/images/c5b54a1d269b3db4f698318bd72e2356.png',
                        final_result: '',
                        timestamp_ns: 1758111833950838300,
                        sandbox_url:
                          'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                      },
                    },
                    timestamp: 1758111827942,
                    // Add isLast
                    isLast: true,
                  },
                  {
                    // Use the tool_result id
                    id: '1758111849971_az9o',
                    role: 'assistant',
                    // type becomes the tool name
                    type: 'browser-use',
                    content: '在新标签页中打开百度首页（https://www.baidu.com）。',
                    detail: {
                      // Keep these fields from tool_call
                      param: {
                        sandbox_url:
                          'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                        brief: '在新标签页中打开百度首页（https://www.baidu.com）。',
                        timestamp_ns: 1758111833950847500,
                      },
                      action: '正在调用 browser-use',
                      action_content: '',
                      // Use these fields from tool_result
                      run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                      tool: 'browser-use',
                      result: {
                        url: 'https://www.baidu.com/',
                        title: '百度一下，你就知道',
                        image_url:
                          'https://example.test/boway/sandbox/i1hvw3ir6vka66ru4ztu0-ecc9fd8d/images/aad692b4160a951336667b00cc608a18.png',
                        final_result: '',
                        timestamp_ns: 1758111849971686000,
                        sandbox_url:
                          'https://remote.example.test/vnc.html?autoconnect=true&view_only=true&resize=scale',
                      },
                      status: 'success',
                    },
                    timestamp: 1758111849984,
                    // Add isLast
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title:
                  '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                status: 'pending',
                started_at: 1758111825367,
                // Add children
                children: [],
              },
            ],

            detail: {
              steps: [
                {
                  id: '1',
                  title: '使用browser-use查询北京本周天气预报信息',
                  status: 'running',
                  started_at: 1758111825367,
                },
                {
                  id: '2',
                  title:
                    '根据天气预报，结合常见通勤方式（如步行、骑行、地铁、公交、打车等），为用户规划本周每日最佳通勤方式，并说明原因',
                  status: 'pending',
                  started_at: 1758111825367,
                },
              ],
            },
            timestamp: 1758111825422,
            // Add isLast
            isLast: true,
          },
        ],
      },
    ]);
  });
});
