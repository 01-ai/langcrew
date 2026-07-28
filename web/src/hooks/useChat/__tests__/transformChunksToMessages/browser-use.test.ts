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
        content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
            content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
            detail: {},
            timestamp: 1758111821217,
          },
        ],
      },
      // IncreaseloadingMessage
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
            'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
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
              content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
            content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
              'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
            detail: {},
            timestamp: 1758111825386,
            // IncreaseisLast
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
                title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                status: 'running',
                started_at: 1758111825367,
              },
              {
                id: '2',
                title:
                  'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
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
              content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
                'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
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
            content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
              'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
            detail: {},
            timestamp: 1758111825386,
            // IncreaseisLast
            isLast: true,
          },
          {
            id: '1758111825367_zpxp',
            role: 'assistant',
            type: 'plan',
            content: '',
            // Increasechildren
            children: [
              {
                id: '1',
                title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                status: 'running',
                started_at: 1758111825367,
                // Increasechildren
                children: [],
              },
              {
                id: '2',
                title:
                  'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                status: 'pending',
                started_at: 1758111825367,
                // Increasechildren
                children: [],
              },
            ],

            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                  status: 'running',
                  started_at: 1758111825367,
                },
                {
                  id: '2',
                  title:
                    'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                  status: 'pending',
                  started_at: 1758111825367,
                },
              ],
            },
            timestamp: 1758111825422,
            // IncreaseisLast
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
              content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
                'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
              detail: {},
              timestamp: 1758111825386,
              // IncreaseisLast
              isLast: true,
            },
            {
              id: '1758111825367_zpxp',
              role: 'assistant',
              type: 'plan',
              content: '',
              // Increasechildren
              children: [
                {
                  id: '1',
                  title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                  status: 'running',
                  started_at: 1758111825367,
                  // Increasechildren
                  children: [],
                },
                {
                  id: '2',
                  title:
                    'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                  status: 'pending',
                  started_at: 1758111825367,
                  // Increasechildren
                  children: [],
                },
              ],

              detail: {
                steps: [
                  {
                    id: '1',
                    title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                    status: 'running',
                    started_at: 1758111825367,
                  },
                  {
                    id: '2',
                    title:
                      'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                    status: 'pending',
                    started_at: 1758111825367,
                  },
                ],
              },
              timestamp: 1758111825422,
              // IncreaseisLast
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
            content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
              'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
            detail: {},
            timestamp: 1758111825386,
            // IncreaseisLast
            isLast: true,
          },
          {
            id: '1758111825367_zpxp',
            role: 'assistant',
            type: 'plan',
            content: '',
            // Increasechildren
            children: [
              {
                id: '1',
                title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                status: 'running',
                started_at: 1758111825367,
                // Increasechildren
                children: [],
              },
              {
                id: '2',
                title:
                  'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                status: 'pending',
                started_at: 1758111825367,
                // Increasechildren
                children: [],
              },
            ],

            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                  status: 'running',
                  started_at: 1758111825367,
                },
                {
                  id: '2',
                  title:
                    'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                  status: 'pending',
                  started_at: 1758111825367,
                },
              ],
            },
            timestamp: 1758111825422,
            // IncreaseisLast
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
          content: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
          detail: {
            run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
            tool: 'browser-use',
            status: 'pending',
            param: {
              sandbox_url:
                'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
              brief: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
              timestamp_ns: 1758111827825830400,
            },
            action: 'Calling browser-use',
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
              content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
                'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
              detail: {},
              timestamp: 1758111825386,
              // IncreaseisLast
              isLast: true,
            },
            {
              id: '1758111825367_zpxp',
              role: 'assistant',
              type: 'plan',
              content: '',
              // Increasechildren
              children: [
                {
                  id: '1',
                  title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                  status: 'running',
                  started_at: 1758111825367,
                  // Increasechildren
                  children: [],
                },
                {
                  id: '2',
                  title:
                    'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                  status: 'pending',
                  started_at: 1758111825367,
                  // Increasechildren
                  children: [],
                },
              ],

              detail: {
                steps: [
                  {
                    id: '1',
                    title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                    status: 'running',
                    started_at: 1758111825367,
                  },
                  {
                    id: '2',
                    title:
                      'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                    status: 'pending',
                    started_at: 1758111825367,
                  },
                ],
              },
              timestamp: 1758111825422,
              // IncreaseisLast
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
            content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
              'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
            detail: {},
            timestamp: 1758111825386,
            // IncreaseisLast
            isLast: true,
          },
          {
            id: '1758111825367_zpxp',
            role: 'assistant',
            type: 'plan',
            content: '',
            // Increasechildren
            children: [
              {
                id: '1',
                title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                status: 'running',
                started_at: 1758111825367,
                // Increasechildren
                children: [
                  {
                    id: '1758111827825_1b8b',
                    role: 'assistant',
                    // type Replace with tool Name
                    type: 'browser-use',
                    content: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                    detail: {
                      run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                      tool: 'browser-use',
                      status: 'pending',
                      param: {
                        sandbox_url:
                          'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                        brief: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                        timestamp_ns: 1758111827825830400,
                      },
                      action: 'Calling browser-use',
                      action_content: '',
                    },
                    timestamp: 1758111827942,
                    // IncreaseisLast
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title:
                  'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                status: 'pending',
                started_at: 1758111825367,
                // Increasechildren
                children: [],
              },
            ],

            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                  status: 'running',
                  started_at: 1758111825367,
                },
                {
                  id: '2',
                  title:
                    'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                  status: 'pending',
                  started_at: 1758111825367,
                },
              ],
            },
            timestamp: 1758111825422,
            // IncreaseisLast
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
                'https://boe.example.invalid/resources/RESOURCE_EXAMPLE_07.png',
              final_result: '',
              timestamp_ns: 1758111833950838300,
              sandbox_url:
                'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
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
              content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
                'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
              detail: {},
              timestamp: 1758111825386,
              // IncreaseisLast
              isLast: true,
            },
            {
              id: '1758111825367_zpxp',
              role: 'assistant',
              type: 'plan',
              content: '',
              // Increasechildren
              children: [
                {
                  id: '1',
                  title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                  status: 'running',
                  started_at: 1758111825367,
                  // Increasechildren
                  children: [
                    {
                      id: '1758111827825_1b8b',
                      role: 'assistant',
                      // type Replace with tool Name
                      type: 'browser-use',
                      content: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                      detail: {
                        run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                        tool: 'browser-use',
                        status: 'pending',
                        param: {
                          sandbox_url:
                            'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                          brief: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                          timestamp_ns: 1758111827825830400,
                        },
                        action: 'Calling browser-use',
                        action_content: '',
                      },
                      timestamp: 1758111827942,
                      // IncreaseisLast
                      isLast: true,
                    },
                  ],
                },
                {
                  id: '2',
                  title:
                    'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                  status: 'pending',
                  started_at: 1758111825367,
                  // Increasechildren
                  children: [],
                },
              ],

              detail: {
                steps: [
                  {
                    id: '1',
                    title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                    status: 'running',
                    started_at: 1758111825367,
                  },
                  {
                    id: '2',
                    title:
                      'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                    status: 'pending',
                    started_at: 1758111825367,
                  },
                ],
              },
              timestamp: 1758111825422,
              // IncreaseisLast
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
            content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
              'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
            detail: {},
            timestamp: 1758111825386,
            // IncreaseisLast
            isLast: true,
          },
          {
            id: '1758111825367_zpxp',
            role: 'assistant',
            type: 'plan',
            content: '',
            // Increasechildren
            children: [
              {
                id: '1',
                title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                status: 'running',
                started_at: 1758111825367,
                // Increasechildren
                children: [
                  {
                    id: '1758111833950_1a98',
                    role: 'assistant',
                    // type Replace with tool Name
                    type: 'browser-use',
                    content: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                    detail: {
                      param: {
                        sandbox_url:
                          'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                        brief: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                        timestamp_ns: 1758111827825830400,
                      },
                      action: 'Calling browser-use',
                      action_content: '',

                      run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                      tool: 'browser-use',
                      result: {
                        url: '',
                        title: '',
                        image_url:
                          'https://boe.example.invalid/resources/RESOURCE_EXAMPLE_07.png',
                        final_result: '',
                        timestamp_ns: 1758111833950838300,
                        sandbox_url:
                          'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                      },
                      status: 'success',
                    },
                    timestamp: 1758111833961,
                    // IncreaseisLast
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title:
                  'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                status: 'pending',
                started_at: 1758111825367,
                // Increasechildren
                children: [],
              },
            ],

            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                  status: 'running',
                  started_at: 1758111825367,
                },
                {
                  id: '2',
                  title:
                    'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                  status: 'pending',
                  started_at: 1758111825367,
                },
              ],
            },
            timestamp: 1758111825422,
            // IncreaseisLast
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
          content: 'Opens the first page in a new tab (in thousands of degrees)https://www.baidu.com）。',
          detail: {
            run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
            tool: 'browser-use',
            status: 'pending',
            param: {
              sandbox_url:
                'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
              brief: 'Opens the first page in a new tab (in thousands of degrees)https://www.baidu.com）。',
              timestamp_ns: 1758111833950847500,
            },
            action: 'Calling browser-use',
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
              content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
                'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
              detail: {},
              timestamp: 1758111825386,
              // IncreaseisLast
              isLast: true,
            },
            {
              id: '1758111825367_zpxp',
              role: 'assistant',
              type: 'plan',
              content: '',
              // Increasechildren
              children: [
                {
                  id: '1',
                  title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                  status: 'running',
                  started_at: 1758111825367,
                  // Increasechildren
                  children: [
                    {
                      id: '1758111833950_1a98',
                      role: 'assistant',
                      // type Replace with tool Name
                      type: 'browser-use',
                      content: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                      detail: {
                        run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                        tool: 'browser-use',
                        status: 'success',
                        param: {
                          sandbox_url:
                            'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                          brief: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                          timestamp_ns: 1758111827825830400,
                        },
                        action: 'Calling browser-use',
                        action_content: '',
                        result: {
                          url: '',
                          title: '',
                          image_url:
                            'https://boe.example.invalid/resources/RESOURCE_EXAMPLE_07.png',
                          final_result: '',
                          timestamp_ns: 1758111833950838300,
                          sandbox_url:
                            'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                        },
                      },
                      timestamp: 1758111827942,
                      // IncreaseisLast
                      isLast: true,
                    },
                  ],
                },
                {
                  id: '2',
                  title:
                    'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                  status: 'pending',
                  started_at: 1758111825367,
                  // Increasechildren
                  children: [],
                },
              ],

              detail: {
                steps: [
                  {
                    id: '1',
                    title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                    status: 'running',
                    started_at: 1758111825367,
                  },
                  {
                    id: '2',
                    title:
                      'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                    status: 'pending',
                    started_at: 1758111825367,
                  },
                ],
              },
              timestamp: 1758111825422,
              // IncreaseisLast
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
            content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
              'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
            detail: {},
            timestamp: 1758111825386,
            // IncreaseisLast
            isLast: true,
          },
          {
            id: '1758111825367_zpxp',
            role: 'assistant',
            type: 'plan',
            content: '',
            // Increasechildren
            children: [
              {
                id: '1',
                title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                status: 'running',
                started_at: 1758111825367,
                // Increasechildren
                children: [
                  {
                    id: '1758111833950_1a98',
                    role: 'assistant',
                    // type Replace with tool Name
                    type: 'browser-use',
                    content: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                    detail: {
                      run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                      tool: 'browser-use',
                      status: 'success',
                      param: {
                        sandbox_url:
                          'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                        brief: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                        timestamp_ns: 1758111827825830400,
                      },
                      action: 'Calling browser-use',
                      action_content: '',
                      result: {
                        url: '',
                        title: '',
                        image_url:
                          'https://boe.example.invalid/resources/RESOURCE_EXAMPLE_07.png',
                        final_result: '',
                        timestamp_ns: 1758111833950838300,
                        sandbox_url:
                          'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                      },
                    },
                    timestamp: 1758111827942,
                    // IncreaseisLast
                    isLast: true,
                  },
                  {
                    id: '1758111833974_8doh',
                    role: 'assistant',
                    // type Replace with tool Name
                    type: 'browser-use',
                    content: 'Opens the first page in a new tab (in thousands of degrees)https://www.baidu.com）。',
                    detail: {
                      run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                      tool: 'browser-use',
                      status: 'pending',
                      param: {
                        sandbox_url:
                          'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                        brief: 'Opens the first page in a new tab (in thousands of degrees)https://www.baidu.com）。',
                        timestamp_ns: 1758111833950847500,
                      },
                      action: 'Calling browser-use',
                      action_content: '',
                    },
                    timestamp: 1758111833984,
                    // IncreaseisLast
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title:
                  'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                status: 'pending',
                started_at: 1758111825367,
                // Increasechildren
                children: [],
              },
            ],

            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                  status: 'running',
                  started_at: 1758111825367,
                },
                {
                  id: '2',
                  title:
                    'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                  status: 'pending',
                  started_at: 1758111825367,
                },
              ],
            },
            timestamp: 1758111825422,
            // IncreaseisLast
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
              title: 'You know it.',
              image_url:
                'https://boe.example.invalid/resources/RESOURCE_EXAMPLE_08.png',
              final_result: '',
              timestamp_ns: 1758111849971686000,
              sandbox_url:
                'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
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
              content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
                'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
              detail: {},
              timestamp: 1758111825386,
              // IncreaseisLast
              isLast: true,
            },
            {
              id: '1758111825367_zpxp',
              role: 'assistant',
              type: 'plan',
              content: '',
              // Increasechildren
              children: [
                {
                  id: '1',
                  title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                  status: 'running',
                  started_at: 1758111825367,
                  // Increasechildren
                  children: [
                    {
                      id: '1758111833950_1a98',
                      role: 'assistant',
                      // type Replace with tool Name
                      type: 'browser-use',
                      content: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                      detail: {
                        run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                        tool: 'browser-use',
                        status: 'success',
                        param: {
                          sandbox_url:
                            'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                          brief: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                          timestamp_ns: 1758111827825830400,
                        },
                        action: 'Calling browser-use',
                        action_content: '',
                        result: {
                          url: '',
                          title: '',
                          image_url:
                            'https://boe.example.invalid/resources/RESOURCE_EXAMPLE_07.png',
                          final_result: '',
                          timestamp_ns: 1758111833950838300,
                          sandbox_url:
                            'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                        },
                      },
                      timestamp: 1758111827942,
                      // IncreaseisLast
                      isLast: true,
                    },
                    {
                      id: '1758111833974_8doh',
                      role: 'assistant',
                      // type Replace with tool Name
                      type: 'browser-use',
                      content: 'Opens the first page in a new tab (in thousands of degrees)https://www.baidu.com）。',
                      detail: {
                        run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                        tool: 'browser-use',
                        status: 'pending',
                        param: {
                          sandbox_url:
                            'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                          brief: 'Opens the first page in a new tab (in thousands of degrees)https://www.baidu.com）。',
                          timestamp_ns: 1758111833950847500,
                        },
                        action: 'Calling browser-use',
                        action_content: '',
                      },
                      timestamp: 1758111833984,
                      // IncreaseisLast
                      isLast: true,
                    },
                  ],
                },
                {
                  id: '2',
                  title:
                    'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                  status: 'pending',
                  started_at: 1758111825367,
                  // Increasechildren
                  children: [],
                },
              ],

              detail: {
                steps: [
                  {
                    id: '1',
                    title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                    status: 'running',
                    started_at: 1758111825367,
                  },
                  {
                    id: '2',
                    title:
                      'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                    status: 'pending',
                    started_at: 1758111825367,
                  },
                ],
              },
              timestamp: 1758111825422,
              // IncreaseisLast
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
            content: 'Again.planTool planning, usebrowser-use Ask Beijing weather. Help me plan the commuting this week.\n\n',
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
              'I will proceed according to the following plans:\n\n1. Usebrowser-useI\'m going to check for weather information for Beijing this week.\n2. Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
            detail: {},
            timestamp: 1758111825386,
            // IncreaseisLast
            isLast: true,
          },
          {
            id: '1758111825367_zpxp',
            role: 'assistant',
            type: 'plan',
            content: '',
            // Increasechildren
            children: [
              {
                id: '1',
                title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                status: 'running',
                started_at: 1758111825367,
                // Increasechildren
                children: [
                  {
                    id: '1758111833950_1a98',
                    role: 'assistant',
                    // type Replace with tool Name
                    type: 'browser-use',
                    content: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                    detail: {
                      run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                      tool: 'browser-use',
                      status: 'success',
                      param: {
                        sandbox_url:
                          'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                        brief: 'Open 100 degrees. Search.“This week\'s weather forecast in Beijing.”，Get the future7Weather information, including temperature, rainfall, wind, etc.',
                        timestamp_ns: 1758111827825830400,
                      },
                      action: 'Calling browser-use',
                      action_content: '',
                      result: {
                        url: '',
                        title: '',
                        image_url:
                          'https://boe.example.invalid/resources/RESOURCE_EXAMPLE_07.png',
                        final_result: '',
                        timestamp_ns: 1758111833950838300,
                        sandbox_url:
                          'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                      },
                    },
                    timestamp: 1758111827942,
                    // IncreaseisLast
                    isLast: true,
                  },
                  {
                    // Replace it with the tool_result ID.
                    id: '1758111849971_az9o',
                    role: 'assistant',
                    // type Replace with tool Name
                    type: 'browser-use',
                    content: 'Opens the first page in a new tab (in thousands of degrees)https://www.baidu.com）。',
                    detail: {
                      // Reservationstool_call, and then click the
                      param: {
                        sandbox_url:
                          'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                        brief: 'Opens the first page in a new tab (in thousands of degrees)https://www.baidu.com）。',
                        timestamp_ns: 1758111833950847500,
                      },
                      action: 'Calling browser-use',
                      action_content: '',
                      // Usetool_result, and then click the
                      run_id: '9820dade-2897-46d6-9dfe-d51accbed76a',
                      tool: 'browser-use',
                      result: {
                        url: 'https://www.baidu.com/',
                        title: 'You know it.',
                        image_url:
                          'https://boe.example.invalid/resources/RESOURCE_EXAMPLE_08.png',
                        final_result: '',
                        timestamp_ns: 1758111849971686000,
                        sandbox_url:
                          'https://sandbox.example.invalid/images/SCREENSHOT_EXAMPLE_01.png',
                      },
                      status: 'success',
                    },
                    timestamp: 1758111849984,
                    // IncreaseisLast
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title:
                  'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                status: 'pending',
                started_at: 1758111825367,
                // Increasechildren
                children: [],
              },
            ],

            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Usebrowser-useI\'m going to check for weather information for Beijing this week.',
                  status: 'running',
                  started_at: 1758111825367,
                },
                {
                  id: '2',
                  title:
                    'Planning for users of the best daily commuting method for the week, based on weather forecasts, in combination with common commuting (e.g., walking, riding, subway, bus, taxi, etc.), with an explanation of the reasons',
                  status: 'pending',
                  started_at: 1758111825367,
                },
              ],
            },
            timestamp: 1758111825422,
            // IncreaseisLast
            isLast: true,
          },
        ],
      },
    ]);
  });
});
