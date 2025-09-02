import { describe, it, expect } from 'vitest';
import { mockData, pptChunks } from './mock';
import { loadingMessage, transformChunksToMessages } from './utils';
import { MessageChunk } from '@/types';

describe('transformChunksToMessages', () => {
  it('1', () => {
    const messages = transformChunksToMessages(pptChunks.slice(0, 1) as MessageChunk[]);
    expect(messages).toEqual([
      {
        role: 'user',
        messages: [pptChunks[0] as MessageChunk],
      },
      loadingMessage,
    ]);
  });

  it('2', () => {
    const messages = transformChunksToMessages(
      [
        {
          id: '1756784056095_43bb5fcc',
          role: 'assistant',
          type: 'message_notify_user',
          content:
            '收到您的请求！我将为您创建一个关于零一万物的PPT介绍。我看到您已经上传了"零一万物-光.pptx"模板文件，我会使用这个模板来制作演示文稿。\n\n让我先分析模板结构，然后收集零一万物的相关信息来创建一个全面的介绍PPT。',
          detail: {
            attachments: [],
            intent_type: 'progress_update',
            scene: 'not_phone',
          },
          timestamp: 1756784056099,
        },
      ] as MessageChunk[],
      [
        {
          role: 'user',
          messages: [
            {
              id: '1756784044508_fcb97c02',
              role: 'user',
              type: 'text',
              content: '介绍零一万物',
              detail: {
                files: [
                  {
                    uid: '1',
                    status: 'done',
                    key: '01AI Light.pptx',
                    url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                    name: '零一万物-光.pptx',
                    size: 10000,
                    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  },
                ],
              },
              timestamp: 1756784044509,
            },
          ],
        },
        loadingMessage,
      ],
    );
    expect(messages).toEqual([
      {
        role: 'user',
        messages: [
          {
            id: '1756784044508_fcb97c02',
            role: 'user',
            type: 'text',
            content: '介绍零一万物',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '零一万物-光.pptx',
                  size: 10000,
                  type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                },
              ],
            },
            timestamp: 1756784044509,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1756784056095_43bb5fcc',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '收到您的请求！我将为您创建一个关于零一万物的PPT介绍。我看到您已经上传了"零一万物-光.pptx"模板文件，我会使用这个模板来制作演示文稿。\n\n让我先分析模板结构，然后收集零一万物的相关信息来创建一个全面的介绍PPT。',
            detail: {
              attachments: [],
              intent_type: 'progress_update',
              scene: 'not_phone',
            },
            timestamp: 1756784056099,
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
          id: '1756784062554_e2988d49',
          role: 'assistant',
          type: 'message_notify_user',
          content:
            '我将按照下列计划进行工作：\n\n1. 分析用户上传的PPT模板结构\n2. 收集零一万物公司的详细信息\n3. 规划PPT内容结构和大纲\n4. 使用模板创建PPT幻灯片\n5. 上传并交付最终PPT文件\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
          detail: {},
          timestamp: 1756784062558,
        },
      ],
      [
        {
          role: 'user',
          messages: [
            {
              id: '1756784044508_fcb97c02',
              role: 'user',
              type: 'text',
              content: '介绍零一万物',
              detail: {
                files: [
                  {
                    uid: '1',
                    status: 'done',
                    key: '01AI Light.pptx',
                    url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                    name: '零一万物-光.pptx',
                    size: 10000,
                    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  },
                ],
              },
              timestamp: 1756784044509,
            },
          ],
        },
        {
          role: 'assistant',
          messages: [
            {
              id: '1756784056095_43bb5fcc',
              role: 'assistant',
              type: 'message_notify_user',
              content:
                '收到您的请求！我将为您创建一个关于零一万物的PPT介绍。我看到您已经上传了"零一万物-光.pptx"模板文件，我会使用这个模板来制作演示文稿。\n\n让我先分析模板结构，然后收集零一万物的相关信息来创建一个全面的介绍PPT。',
              detail: {
                attachments: [],
                intent_type: 'progress_update',
                scene: 'not_phone',
              },
              timestamp: 1756784056099,
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
            id: '1756784044508_fcb97c02',
            role: 'user',
            type: 'text',
            content: '介绍零一万物',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '零一万物-光.pptx',
                  size: 10000,
                  type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                },
              ],
            },
            timestamp: 1756784044509,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1756784056095_43bb5fcc',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '收到您的请求！我将为您创建一个关于零一万物的PPT介绍。我看到您已经上传了"零一万物-光.pptx"模板文件，我会使用这个模板来制作演示文稿。\n\n让我先分析模板结构，然后收集零一万物的相关信息来创建一个全面的介绍PPT。',
            detail: {
              attachments: [],
              intent_type: 'progress_update',
              scene: 'not_phone',
            },
            timestamp: 1756784056099,
            isLast: true,
          },
          {
            id: '1756784062554_e2988d49',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '我将按照下列计划进行工作：\n\n1. 分析用户上传的PPT模板结构\n2. 收集零一万物公司的详细信息\n3. 规划PPT内容结构和大纲\n4. 使用模板创建PPT幻灯片\n5. 上传并交付最终PPT文件\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1756784062558,
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
          id: '1756784062580_8bd8162a',
          role: 'assistant',
          type: 'plan',
          content: '创建一个全面介绍零一万物公司的PPT演示文稿，使用用户提供的模板',
          detail: {
            steps: [
              {
                id: '1',
                title: '分析用户上传的PPT模板结构',
                status: 'running',
                started_at: 1756784062580,
              },
              {
                id: '2',
                title: '收集零一万物公司的详细信息',
                status: 'pending',
                started_at: 1756784062580,
              },
              {
                id: '3',
                title: '规划PPT内容结构和大纲',
                status: 'pending',
                started_at: 1756784062580,
              },
              {
                id: '4',
                title: '使用模板创建PPT幻灯片',
                status: 'pending',
                started_at: 1756784062580,
              },
              {
                id: '5',
                title: '上传并交付最终PPT文件',
                status: 'pending',
                started_at: 1756784062580,
              },
            ],
          },
          timestamp: 1756784062588,
        },
      ],
      [
        {
          role: 'user',
          messages: [
            {
              id: '1756784044508_fcb97c02',
              role: 'user',
              type: 'text',
              content: '介绍零一万物',
              detail: {
                files: [
                  {
                    uid: '1',
                    status: 'done',
                    key: '01AI Light.pptx',
                    url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                    name: '零一万物-光.pptx',
                    size: 10000,
                    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  },
                ],
              },
              timestamp: 1756784044509,
            },
          ],
        },
        {
          role: 'assistant',
          messages: [
            {
              id: '1756784056095_43bb5fcc',
              role: 'assistant',
              type: 'message_notify_user',
              content:
                '收到您的请求！我将为您创建一个关于零一万物的PPT介绍。我看到您已经上传了"零一万物-光.pptx"模板文件，我会使用这个模板来制作演示文稿。\n\n让我先分析模板结构，然后收集零一万物的相关信息来创建一个全面的介绍PPT。',
              detail: {
                attachments: [],
                intent_type: 'progress_update',
                scene: 'not_phone',
              },
              timestamp: 1756784056099,
              isLast: true,
            },
            {
              id: '1756784062554_e2988d49',
              role: 'assistant',
              type: 'message_notify_user',
              content:
                '我将按照下列计划进行工作：\n\n1. 分析用户上传的PPT模板结构\n2. 收集零一万物公司的详细信息\n3. 规划PPT内容结构和大纲\n4. 使用模板创建PPT幻灯片\n5. 上传并交付最终PPT文件\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
              detail: {},
              timestamp: 1756784062558,
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
            id: '1756784044508_fcb97c02',
            role: 'user',
            type: 'text',
            content: '介绍零一万物',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '零一万物-光.pptx',
                  size: 10000,
                  type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                },
              ],
            },
            timestamp: 1756784044509,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1756784056095_43bb5fcc',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '收到您的请求！我将为您创建一个关于零一万物的PPT介绍。我看到您已经上传了"零一万物-光.pptx"模板文件，我会使用这个模板来制作演示文稿。\n\n让我先分析模板结构，然后收集零一万物的相关信息来创建一个全面的介绍PPT。',
            detail: {
              attachments: [],
              intent_type: 'progress_update',
              scene: 'not_phone',
            },
            timestamp: 1756784056099,
            isLast: true,
          },
          {
            id: '1756784062554_e2988d49',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '我将按照下列计划进行工作：\n\n1. 分析用户上传的PPT模板结构\n2. 收集零一万物公司的详细信息\n3. 规划PPT内容结构和大纲\n4. 使用模板创建PPT幻灯片\n5. 上传并交付最终PPT文件\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1756784062558,
            isLast: true,
          },
          {
            id: '1756784062580_8bd8162a',
            role: 'assistant',
            type: 'plan',
            content: '创建一个全面介绍零一万物公司的PPT演示文稿，使用用户提供的模板',
            children: [
              {
                id: '1',
                title: '分析用户上传的PPT模板结构',
                status: 'running',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '2',
                title: '收集零一万物公司的详细信息',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '3',
                title: '规划PPT内容结构和大纲',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '4',
                title: '使用模板创建PPT幻灯片',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '5',
                title: '上传并交付最终PPT文件',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: '分析用户上传的PPT模板结构',
                  status: 'running',
                  started_at: 1756784062580,
                },
                {
                  id: '2',
                  title: '收集零一万物公司的详细信息',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '3',
                  title: '规划PPT内容结构和大纲',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '4',
                  title: '使用模板创建PPT幻灯片',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '5',
                  title: '上传并交付最终PPT文件',
                  status: 'pending',
                  started_at: 1756784062580,
                },
              ],
            },
            timestamp: 1756784062588,
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
          id: '1756784066577_7cde3c6f',
          role: 'assistant',
          type: 'tool_call',
          content: '',
          detail: {
            run_id: '981dd306-21b8-4533-ad9e-fdf4d33f22c4',
            tool: 'choose_and_read_template_pptx_info',
            status: 'pending',
            param: {
              pptx_path: '/workspace/upload/零一万物-光.pptx',
            },
            action: '正在调用 choose_and_read_template_pptx_info',
            action_content: '',
          },
          timestamp: 1756784071547,
        },
      ],
      [
        {
          role: 'user',
          messages: [
            {
              id: '1756784044508_fcb97c02',
              role: 'user',
              type: 'text',
              content: '介绍零一万物',
              detail: {
                files: [
                  {
                    uid: '1',
                    status: 'done',
                    key: '01AI Light.pptx',
                    url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                    name: '零一万物-光.pptx',
                    size: 10000,
                    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  },
                ],
              },
              timestamp: 1756784044509,
            },
          ],
        },
        {
          role: 'assistant',
          messages: [
            {
              id: '1756784056095_43bb5fcc',
              role: 'assistant',
              type: 'message_notify_user',
              content:
                '收到您的请求！我将为您创建一个关于零一万物的PPT介绍。我看到您已经上传了"零一万物-光.pptx"模板文件，我会使用这个模板来制作演示文稿。\n\n让我先分析模板结构，然后收集零一万物的相关信息来创建一个全面的介绍PPT。',
              detail: {
                attachments: [],
                intent_type: 'progress_update',
                scene: 'not_phone',
              },
              timestamp: 1756784056099,
              isLast: true,
            },
            {
              id: '1756784062554_e2988d49',
              role: 'assistant',
              type: 'message_notify_user',
              content:
                '我将按照下列计划进行工作：\n\n1. 分析用户上传的PPT模板结构\n2. 收集零一万物公司的详细信息\n3. 规划PPT内容结构和大纲\n4. 使用模板创建PPT幻灯片\n5. 上传并交付最终PPT文件\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
              detail: {},
              timestamp: 1756784062558,
              isLast: true,
            },
            {
              id: '1756784062580_8bd8162a',
              role: 'assistant',
              type: 'plan',
              content: '创建一个全面介绍零一万物公司的PPT演示文稿，使用用户提供的模板',
              children: [
                {
                  id: '1',
                  title: '分析用户上传的PPT模板结构',
                  status: 'running',
                  started_at: 1756784062580,
                  children: [],
                },
                {
                  id: '2',
                  title: '收集零一万物公司的详细信息',
                  status: 'pending',
                  started_at: 1756784062580,
                  children: [],
                },
                {
                  id: '3',
                  title: '规划PPT内容结构和大纲',
                  status: 'pending',
                  started_at: 1756784062580,
                  children: [],
                },
                {
                  id: '4',
                  title: '使用模板创建PPT幻灯片',
                  status: 'pending',
                  started_at: 1756784062580,
                  children: [],
                },
                {
                  id: '5',
                  title: '上传并交付最终PPT文件',
                  status: 'pending',
                  started_at: 1756784062580,
                  children: [],
                },
              ],
              detail: {
                steps: [
                  {
                    id: '1',
                    title: '分析用户上传的PPT模板结构',
                    status: 'running',
                    started_at: 1756784062580,
                  },
                  {
                    id: '2',
                    title: '收集零一万物公司的详细信息',
                    status: 'pending',
                    started_at: 1756784062580,
                  },
                  {
                    id: '3',
                    title: '规划PPT内容结构和大纲',
                    status: 'pending',
                    started_at: 1756784062580,
                  },
                  {
                    id: '4',
                    title: '使用模板创建PPT幻灯片',
                    status: 'pending',
                    started_at: 1756784062580,
                  },
                  {
                    id: '5',
                    title: '上传并交付最终PPT文件',
                    status: 'pending',
                    started_at: 1756784062580,
                  },
                ],
              },
              timestamp: 1756784062588,
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
            id: '1756784044508_fcb97c02',
            role: 'user',
            type: 'text',
            content: '介绍零一万物',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '零一万物-光.pptx',
                  size: 10000,
                  type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                },
              ],
            },
            timestamp: 1756784044509,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1756784056095_43bb5fcc',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '收到您的请求！我将为您创建一个关于零一万物的PPT介绍。我看到您已经上传了"零一万物-光.pptx"模板文件，我会使用这个模板来制作演示文稿。\n\n让我先分析模板结构，然后收集零一万物的相关信息来创建一个全面的介绍PPT。',
            detail: {
              attachments: [],
              intent_type: 'progress_update',
              scene: 'not_phone',
            },
            timestamp: 1756784056099,
            isLast: true,
          },
          {
            id: '1756784062554_e2988d49',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '我将按照下列计划进行工作：\n\n1. 分析用户上传的PPT模板结构\n2. 收集零一万物公司的详细信息\n3. 规划PPT内容结构和大纲\n4. 使用模板创建PPT幻灯片\n5. 上传并交付最终PPT文件\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1756784062558,
            isLast: true,
          },
          {
            id: '1756784062580_8bd8162a',
            role: 'assistant',
            type: 'plan',
            content: '创建一个全面介绍零一万物公司的PPT演示文稿，使用用户提供的模板',
            children: [
              {
                id: '1',
                title: '分析用户上传的PPT模板结构',
                status: 'running',
                started_at: 1756784062580,
                children: [
                  {
                    id: '1756784066577_7cde3c6f',
                    role: 'assistant',
                    type: 'choose_and_read_template_pptx_info',
                    content: '',
                    detail: {
                      run_id: '981dd306-21b8-4533-ad9e-fdf4d33f22c4',
                      tool: 'choose_and_read_template_pptx_info',
                      status: 'pending',
                      param: {
                        pptx_path: '/workspace/upload/零一万物-光.pptx',
                      },
                      action: '正在调用 choose_and_read_template_pptx_info',
                      action_content: '',
                    },
                    timestamp: 1756784071547,
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: '收集零一万物公司的详细信息',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '3',
                title: '规划PPT内容结构和大纲',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '4',
                title: '使用模板创建PPT幻灯片',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '5',
                title: '上传并交付最终PPT文件',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: '分析用户上传的PPT模板结构',
                  status: 'running',
                  started_at: 1756784062580,
                },
                {
                  id: '2',
                  title: '收集零一万物公司的详细信息',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '3',
                  title: '规划PPT内容结构和大纲',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '4',
                  title: '使用模板创建PPT幻灯片',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '5',
                  title: '上传并交付最终PPT文件',
                  status: 'pending',
                  started_at: 1756784062580,
                },
              ],
            },
            timestamp: 1756784062588,
            isLast: true,
          },
        ],
      },
    ]);
  });

  it('6', () => {
    const messages = transformChunksToMessages(pptChunks.slice(5, 6) as MessageChunk[], [
      {
        role: 'user',
        messages: [
          {
            id: '1756784044508_fcb97c02',
            role: 'user',
            type: 'text',
            content: '介绍零一万物',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '零一万物-光.pptx',
                  size: 10000,
                  type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                },
              ],
            },
            timestamp: 1756784044509,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1756784056095_43bb5fcc',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '收到您的请求！我将为您创建一个关于零一万物的PPT介绍。我看到您已经上传了"零一万物-光.pptx"模板文件，我会使用这个模板来制作演示文稿。\n\n让我先分析模板结构，然后收集零一万物的相关信息来创建一个全面的介绍PPT。',
            detail: {
              attachments: [],
              intent_type: 'progress_update',
              scene: 'not_phone',
            },
            timestamp: 1756784056099,
            isLast: true,
          },
          {
            id: '1756784062554_e2988d49',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '我将按照下列计划进行工作：\n\n1. 分析用户上传的PPT模板结构\n2. 收集零一万物公司的详细信息\n3. 规划PPT内容结构和大纲\n4. 使用模板创建PPT幻灯片\n5. 上传并交付最终PPT文件\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1756784062558,
            isLast: true,
          },
          {
            id: '1756784062580_8bd8162a',
            role: 'assistant',
            type: 'plan',
            content: '创建一个全面介绍零一万物公司的PPT演示文稿，使用用户提供的模板',
            children: [
              {
                id: '1',
                title: '分析用户上传的PPT模板结构',
                status: 'running',
                started_at: 1756784062580,
                children: [
                  {
                    id: '1756784066577_7cde3c6f',
                    role: 'assistant',
                    type: 'choose_and_read_template_pptx_info',
                    content: '',
                    detail: {
                      run_id: '981dd306-21b8-4533-ad9e-fdf4d33f22c4',
                      tool: 'choose_and_read_template_pptx_info',
                      status: 'pending',
                      param: {
                        pptx_path: '/workspace/upload/零一万物-光.pptx',
                      },
                      action: '正在调用 choose_and_read_template_pptx_info',
                      action_content: '',
                    },
                    timestamp: 1756784071547,
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: '收集零一万物公司的详细信息',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '3',
                title: '规划PPT内容结构和大纲',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '4',
                title: '使用模板创建PPT幻灯片',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '5',
                title: '上传并交付最终PPT文件',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: '分析用户上传的PPT模板结构',
                  status: 'running',
                  started_at: 1756784062580,
                },
                {
                  id: '2',
                  title: '收集零一万物公司的详细信息',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '3',
                  title: '规划PPT内容结构和大纲',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '4',
                  title: '使用模板创建PPT幻灯片',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '5',
                  title: '上传并交付最终PPT文件',
                  status: 'pending',
                  started_at: 1756784062580,
                },
              ],
            },
            timestamp: 1756784062588,
            isLast: true,
          },
        ],
      },
    ]);
    expect(messages).toEqual([
      {
        role: 'user',
        messages: [
          {
            id: '1756784044508_fcb97c02',
            role: 'user',
            type: 'text',
            content: '介绍零一万物',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '零一万物-光.pptx',
                  size: 10000,
                  type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                },
              ],
            },
            timestamp: 1756784044509,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1756784056095_43bb5fcc',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '收到您的请求！我将为您创建一个关于零一万物的PPT介绍。我看到您已经上传了"零一万物-光.pptx"模板文件，我会使用这个模板来制作演示文稿。\n\n让我先分析模板结构，然后收集零一万物的相关信息来创建一个全面的介绍PPT。',
            detail: {
              attachments: [],
              intent_type: 'progress_update',
              scene: 'not_phone',
            },
            timestamp: 1756784056099,
            isLast: true,
          },
          {
            id: '1756784062554_e2988d49',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '我将按照下列计划进行工作：\n\n1. 分析用户上传的PPT模板结构\n2. 收集零一万物公司的详细信息\n3. 规划PPT内容结构和大纲\n4. 使用模板创建PPT幻灯片\n5. 上传并交付最终PPT文件\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1756784062558,
            isLast: true,
          },
          {
            id: '1756784062580_8bd8162a',
            role: 'assistant',
            type: 'plan',
            content: '创建一个全面介绍零一万物公司的PPT演示文稿，使用用户提供的模板',
            children: [
              {
                id: '1',
                title: '分析用户上传的PPT模板结构',
                status: 'running',
                started_at: 1756784062580,
                children: [
                  {
                    id: '1756784066577_7cde3c6f',
                    role: 'assistant',
                    type: 'choose_and_read_template_pptx_info',
                    content: '',
                    detail: {
                      tool: 'choose_and_read_template_pptx_info',
                      run_id: '981dd306-21b8-4533-ad9e-fdf4d33f22c4',
                      result: {
                        content:
                          '{"content": "[\\n  {\\n    \\"slide_number\\": 1,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"be179f3b\\": [\\n          \\"01AI Presentation\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 2,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"83b517ce\\": [\\n          \\"此处为备注内容\\"\\n        ],\\n        \\"682a9d2a\\": [\\n          \\"此处为段落标题1\\"\\n        ],\\n        \\"64b215f0\\": [\\n          \\"04\\"\\n        ],\\n        \\"19a37359\\": [\\n          \\"此处为备注内容\\"\\n        ],\\n        \\"1aa366ef\\": [\\n          \\"此处为段落标题1\\"\\n        ],\\n        \\"db61c16c\\": [\\n          \\"02\\"\\n        ],\\n        \\"9dd5986c\\": [\\n          \\"此处为备注内容\\"\\n        ],\\n        \\"eb5d339f\\": [\\n          \\"此处为段落标题1\\"\\n        ],\\n        \\"8b642dcc\\": [\\n          \\"03\\"\\n        ],\\n        \\"9e319fcb\\": [\\n          \\"此处为备注内容\\"\\n        ],\\n        \\"ee8da08a\\": [\\n          \\"此处为段落标题1\\"\\n        ],\\n        \\"f2a48842\\": [\\n          \\"01\\"\\n        ],\\n        \\"8351ea2e\\": [\\n          \\"目录\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 3,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"a9775c2a\\": [\\n          \\"零一万物介绍\\"\\n        ],\\n        \\"722f74e7\\": [\\n          \\"“零一万物”基于零和一，通过数字化实现万物互联与智能管理，推动数字化转型和智慧社会建设。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 4,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"f9ee6954\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"c15b6480\\": [\\n          \\"正文标题文案\\"\\n        ],\\n        \\"a34fe09f\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"dcfced38\\": [\\n          \\"AI 2.0 平台\\"\\n        ],\\n        \\"5655a992\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"9f58fe6c\\": [\\n          \\"AI 2.0 平台\\"\\n        ],\\n        \\"4a064350\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"23129021\\": [\\n          \\"AI 2.0 平台\\"\\n        ],\\n        \\"96cc470d\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"309ca158\\": [\\n          \\"AI 2.0 平台\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 5,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"eae66713\\": [\\n          \\"零一的哲学与数学意义\\"\\n        ],\\n        \\"14b01155\\": [\\n          \\"零的起源与发展\\"\\n        ],\\n        \\"4b8d5330\\": [\\n          \\"一的象征意义\\"\\n        ],\\n        \\"e1543e6b\\": [\\n          \\"零与一在数学中的基本作用\\"\\n        ],\\n        \\"a1b45b87\\": [\\n          \\"零的概念起源于古代文明，印度数学家将零作为独立数字发明，推动数学体系完善与科学进步。\\"\\n        ],\\n        \\"7d8cb902\\": [\\n          \\"数字一象征统一和起点，是自然数的起始和乘法恒等元，代表整体统一性和万物本源。\\"\\n        ],\\n        \\"75ef77d4\\": [\\n          \\"零和一是数学基石，零为加减法身份元素，一为乘法核心，二者构成数字系统基础，促进计算与信息处理。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 6,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"fc354462\\": [\\n          \\"零一在信息技术中的应用\\"\\n        ],\\n        \\"81c521dc\\": [\\n          \\"二进制系统基础\\"\\n        ],\\n        \\"c9ff1628\\": [\\n          \\"计算机如何使用零和一进行运算\\"\\n        ],\\n        \\"477c00b4\\": [\\n          \\"零一编码与数据存储\\"\\n        ],\\n        \\"903bf9c9\\": [\\n          \\"1\\"\\n        ],\\n        \\"9c00c483\\": [\\n          \\"二进制系统采用零和一两种状态表示所有数据和指令，是计算机及数字设备的核心语言，简化电路设计并确保数据传输准确。\\"\\n        ],\\n        \\"131611a9\\": [\\n          \\"2\\"\\n        ],\\n        \\"7fe0b43b\\": [\\n          \\"计算机将信息转换为二进制代码，通过逻辑门执行算术和逻辑操作，实现复杂数据处理和程序执行。\\"\\n        ],\\n        \\"52f74783\\": [\\n          \\"3\\"\\n        ],\\n        \\"ff45f2a8\\": [\\n          \\"零一编码将信息转换为二进制形式，适合存储和传输，常见编码有ASCII和Unicode，存储设备通过电荷变化保存数据。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 7,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"c5d8ade1\\": [\\n          \\"零一在信息技术中的应用\\"\\n        ],\\n        \\"b0993f80\\": [\\n          \\"数字化万物的实现方式\\"\\n        ],\\n        \\"5e3209a4\\": [\\n          \\"通过传感器采集数据、网络实时传输、云计算存储分析及智能算法决策，实现实体与数字世界的无缝连接。\\"\\n        ],\\n        \\"27103ac8\\": [\\n          \\"物联网中的零一应用\\"\\n        ],\\n        \\"71712164\\": [\\n          \\"零一编码作为二进制基础，确保物联网中数据准确传输和设备高效协作，推动智能家居和智慧城市发展。\\"\\n        ],\\n        \\"de614814\\": [\\n          \\"数字孪生技术简介\\"\\n        ],\\n        \\"31b55279\\": [\\n          \\"利用零一数据与三维建模结合，实现实体设备的实时映射、故障预测和维护优化，促进数字经济融合。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 8,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"dff43bdd\\": [\\n          \\"零一在信息技术中的应用\\"\\n        ],\\n        \\"75d19ee0\\": [\\n          \\"智能生活的普及\\"\\n        ],\\n        \\"c4a426df\\": [\\n          \\"零一技术推动智能家居、智能穿戴和智能交通系统普及，提升生活便捷性和资源利用效率。\\"\\n        ],\\n        \\"00e037d3\\": [\\n          \\"零一技术推动产业变革\\"\\n        ],\\n        \\"b4de8dbb\\": [\\n          \\"零一技术促进制造业智能化、农业精准管理和服务业数字化，推动产业链重塑和经济高质量发展。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 9,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"4b7576d4\\": [\\n          \\"零一万物的挑战与问题\\"\\n        ],\\n        \\"a1ca8c3f\\": [\\n          \\"智能生活的普及\\"\\n        ],\\n        \\"f9176f86\\": [\\n          \\"零一技术推动智能家居、智能穿戴和智能交通系统普及，提升生活便捷性和资源利用效率。\\"\\n        ],\\n        \\"fbec61e5\\": [\\n          \\"技术鸿沟与数字排斥\\"\\n        ],\\n        \\"e77ae3d9\\": [\\n          \\"技术鸿沟导致部分群体数字排斥，需缩小城乡差距、提升数字素养和普及基础设施，实现数字社会的包容性发展。\\"\\n        ],\\n        \\"b9b4bb28\\": [\\n          \\"伦理与法律问题\\"\\n        ],\\n        \\"67598b22\\": [\\n          \\"零一万物发展带来伦理和法律挑战，需建立规范和法律框架，保障数据合法使用、人工智能透明及就业影响的合理应对。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 10,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"5144e569\\": [\\n          \\"零一万物的未来展望\\"\\n        ],\\n        \\"db5ff530\\": [\\n          \\"人工智能与零一技术的融合\\"\\n        ],\\n        \\"2e7e6eec\\": [\\n          \\"零一技术为人工智能提供基础数据表示与运算方式，推动智能系统实现全链条智能提升。\\"\\n        ],\\n        \\"7f245244\\": [\\n          \\"量子计算对零一体系的影响\\"\\n        ],\\n        \\"bdbde1cb\\": [\\n          \\"量子计算突破传统零一限制，推动经典零一技术与量子计算共存发展，拓展计算能力边界。\\"\\n        ],\\n        \\"0a629dfc\\": [\\n          \\"智能城市与智慧社会的构建\\"\\n        ],\\n        \\"e2197e6e\\": [\\n          \\"零一技术驱动智能城市核心系统，实现智能化管理，提升生活质量与城市运行效率。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 11,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"61d550f6\\": [\\n          \\"总结与思考\\"\\n        ],\\n        \\"86dba575\\": [\\n          \\"零一万物的核心价值回顾\\"\\n        ],\\n        \\"f4abbd51\\": [\\n          \\"零一万物体现了信息的基本单位零和一的潜力，是数字时代的基础概念，驱动数字化转型和产业升级。\\"\\n        ],\\n        \\"4428e62e\\": [\\n          \\"面向未来的数字化思考\\"\\n        ],\\n        \\"cd06c39d\\": [\\n          \\"新兴技术融合推动零一万物应用扩展，数字化转型改变生产生活，需关注公平性和数据安全。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 12,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"33017331\\": [\\n          \\"谢 谢\\"\\n        ]\\n      }\\n    }\\n  }\\n]", "content_type": "markdown", "status": "success", "template_path": "/tmp/doc/uploaded_template_109f091d397042ed_零一万物-光.pptx"}',
                        additional_kwargs: {},
                        response_metadata: {},
                        type: 'tool',
                        name: 'choose_and_read_template_pptx_info',
                        id: '47c60773-a8ec-42a4-966f-7fc775888fcd',
                        tool_call_id: 'tooluse_Zk6nBNkWQSSo41jwhYZKPQ',
                        artifact: null,
                        status: 'success',
                      },
                      status: 'success',
                      param: {
                        pptx_path: '/workspace/upload/零一万物-光.pptx',
                      },
                      action: '正在调用 choose_and_read_template_pptx_info',
                      action_content: '',
                    },
                    timestamp: 1756784071547,
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: '收集零一万物公司的详细信息',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '3',
                title: '规划PPT内容结构和大纲',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '4',
                title: '使用模板创建PPT幻灯片',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '5',
                title: '上传并交付最终PPT文件',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: '分析用户上传的PPT模板结构',
                  status: 'running',
                  started_at: 1756784062580,
                },
                {
                  id: '2',
                  title: '收集零一万物公司的详细信息',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '3',
                  title: '规划PPT内容结构和大纲',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '4',
                  title: '使用模板创建PPT幻灯片',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '5',
                  title: '上传并交付最终PPT文件',
                  status: 'pending',
                  started_at: 1756784062580,
                },
              ],
            },
            timestamp: 1756784062588,
            isLast: true,
          },
        ],
      },
    ]);
  });

  it('7', () => {
    const messages = transformChunksToMessages(pptChunks.slice(6, 7) as MessageChunk[], [
      {
        role: 'user',
        messages: [
          {
            id: '1756784044508_fcb97c02',
            role: 'user',
            type: 'text',
            content: '介绍零一万物',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '零一万物-光.pptx',
                  size: 10000,
                  type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                },
              ],
            },
            timestamp: 1756784044509,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1756784056095_43bb5fcc',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '收到您的请求！我将为您创建一个关于零一万物的PPT介绍。我看到您已经上传了"零一万物-光.pptx"模板文件，我会使用这个模板来制作演示文稿。\n\n让我先分析模板结构，然后收集零一万物的相关信息来创建一个全面的介绍PPT。',
            detail: {
              attachments: [],
              intent_type: 'progress_update',
              scene: 'not_phone',
            },
            timestamp: 1756784056099,
            isLast: true,
          },
          {
            id: '1756784062554_e2988d49',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '我将按照下列计划进行工作：\n\n1. 分析用户上传的PPT模板结构\n2. 收集零一万物公司的详细信息\n3. 规划PPT内容结构和大纲\n4. 使用模板创建PPT幻灯片\n5. 上传并交付最终PPT文件\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1756784062558,
            isLast: true,
          },
          {
            id: '1756784062580_8bd8162a',
            role: 'assistant',
            type: 'plan',
            content: '创建一个全面介绍零一万物公司的PPT演示文稿，使用用户提供的模板',
            children: [
              {
                id: '1',
                title: '分析用户上传的PPT模板结构',
                status: 'running',
                started_at: 1756784062580,
                children: [
                  {
                    id: '1756784066577_7cde3c6f',
                    role: 'assistant',
                    type: 'choose_and_read_template_pptx_info',
                    content: '',
                    detail: {
                      tool: 'choose_and_read_template_pptx_info',
                      run_id: '981dd306-21b8-4533-ad9e-fdf4d33f22c4',
                      result: {
                        content:
                          '{"content": "[\\n  {\\n    \\"slide_number\\": 1,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"be179f3b\\": [\\n          \\"01AI Presentation\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 2,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"83b517ce\\": [\\n          \\"此处为备注内容\\"\\n        ],\\n        \\"682a9d2a\\": [\\n          \\"此处为段落标题1\\"\\n        ],\\n        \\"64b215f0\\": [\\n          \\"04\\"\\n        ],\\n        \\"19a37359\\": [\\n          \\"此处为备注内容\\"\\n        ],\\n        \\"1aa366ef\\": [\\n          \\"此处为段落标题1\\"\\n        ],\\n        \\"db61c16c\\": [\\n          \\"02\\"\\n        ],\\n        \\"9dd5986c\\": [\\n          \\"此处为备注内容\\"\\n        ],\\n        \\"eb5d339f\\": [\\n          \\"此处为段落标题1\\"\\n        ],\\n        \\"8b642dcc\\": [\\n          \\"03\\"\\n        ],\\n        \\"9e319fcb\\": [\\n          \\"此处为备注内容\\"\\n        ],\\n        \\"ee8da08a\\": [\\n          \\"此处为段落标题1\\"\\n        ],\\n        \\"f2a48842\\": [\\n          \\"01\\"\\n        ],\\n        \\"8351ea2e\\": [\\n          \\"目录\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 3,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"a9775c2a\\": [\\n          \\"零一万物介绍\\"\\n        ],\\n        \\"722f74e7\\": [\\n          \\"“零一万物”基于零和一，通过数字化实现万物互联与智能管理，推动数字化转型和智慧社会建设。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 4,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"f9ee6954\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"c15b6480\\": [\\n          \\"正文标题文案\\"\\n        ],\\n        \\"a34fe09f\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"dcfced38\\": [\\n          \\"AI 2.0 平台\\"\\n        ],\\n        \\"5655a992\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"9f58fe6c\\": [\\n          \\"AI 2.0 平台\\"\\n        ],\\n        \\"4a064350\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"23129021\\": [\\n          \\"AI 2.0 平台\\"\\n        ],\\n        \\"96cc470d\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"309ca158\\": [\\n          \\"AI 2.0 平台\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 5,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"eae66713\\": [\\n          \\"零一的哲学与数学意义\\"\\n        ],\\n        \\"14b01155\\": [\\n          \\"零的起源与发展\\"\\n        ],\\n        \\"4b8d5330\\": [\\n          \\"一的象征意义\\"\\n        ],\\n        \\"e1543e6b\\": [\\n          \\"零与一在数学中的基本作用\\"\\n        ],\\n        \\"a1b45b87\\": [\\n          \\"零的概念起源于古代文明，印度数学家将零作为独立数字发明，推动数学体系完善与科学进步。\\"\\n        ],\\n        \\"7d8cb902\\": [\\n          \\"数字一象征统一和起点，是自然数的起始和乘法恒等元，代表整体统一性和万物本源。\\"\\n        ],\\n        \\"75ef77d4\\": [\\n          \\"零和一是数学基石，零为加减法身份元素，一为乘法核心，二者构成数字系统基础，促进计算与信息处理。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 6,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"fc354462\\": [\\n          \\"零一在信息技术中的应用\\"\\n        ],\\n        \\"81c521dc\\": [\\n          \\"二进制系统基础\\"\\n        ],\\n        \\"c9ff1628\\": [\\n          \\"计算机如何使用零和一进行运算\\"\\n        ],\\n        \\"477c00b4\\": [\\n          \\"零一编码与数据存储\\"\\n        ],\\n        \\"903bf9c9\\": [\\n          \\"1\\"\\n        ],\\n        \\"9c00c483\\": [\\n          \\"二进制系统采用零和一两种状态表示所有数据和指令，是计算机及数字设备的核心语言，简化电路设计并确保数据传输准确。\\"\\n        ],\\n        \\"131611a9\\": [\\n          \\"2\\"\\n        ],\\n        \\"7fe0b43b\\": [\\n          \\"计算机将信息转换为二进制代码，通过逻辑门执行算术和逻辑操作，实现复杂数据处理和程序执行。\\"\\n        ],\\n        \\"52f74783\\": [\\n          \\"3\\"\\n        ],\\n        \\"ff45f2a8\\": [\\n          \\"零一编码将信息转换为二进制形式，适合存储和传输，常见编码有ASCII和Unicode，存储设备通过电荷变化保存数据。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 7,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"c5d8ade1\\": [\\n          \\"零一在信息技术中的应用\\"\\n        ],\\n        \\"b0993f80\\": [\\n          \\"数字化万物的实现方式\\"\\n        ],\\n        \\"5e3209a4\\": [\\n          \\"通过传感器采集数据、网络实时传输、云计算存储分析及智能算法决策，实现实体与数字世界的无缝连接。\\"\\n        ],\\n        \\"27103ac8\\": [\\n          \\"物联网中的零一应用\\"\\n        ],\\n        \\"71712164\\": [\\n          \\"零一编码作为二进制基础，确保物联网中数据准确传输和设备高效协作，推动智能家居和智慧城市发展。\\"\\n        ],\\n        \\"de614814\\": [\\n          \\"数字孪生技术简介\\"\\n        ],\\n        \\"31b55279\\": [\\n          \\"利用零一数据与三维建模结合，实现实体设备的实时映射、故障预测和维护优化，促进数字经济融合。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 8,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"dff43bdd\\": [\\n          \\"零一在信息技术中的应用\\"\\n        ],\\n        \\"75d19ee0\\": [\\n          \\"智能生活的普及\\"\\n        ],\\n        \\"c4a426df\\": [\\n          \\"零一技术推动智能家居、智能穿戴和智能交通系统普及，提升生活便捷性和资源利用效率。\\"\\n        ],\\n        \\"00e037d3\\": [\\n          \\"零一技术推动产业变革\\"\\n        ],\\n        \\"b4de8dbb\\": [\\n          \\"零一技术促进制造业智能化、农业精准管理和服务业数字化，推动产业链重塑和经济高质量发展。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 9,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"4b7576d4\\": [\\n          \\"零一万物的挑战与问题\\"\\n        ],\\n        \\"a1ca8c3f\\": [\\n          \\"智能生活的普及\\"\\n        ],\\n        \\"f9176f86\\": [\\n          \\"零一技术推动智能家居、智能穿戴和智能交通系统普及，提升生活便捷性和资源利用效率。\\"\\n        ],\\n        \\"fbec61e5\\": [\\n          \\"技术鸿沟与数字排斥\\"\\n        ],\\n        \\"e77ae3d9\\": [\\n          \\"技术鸿沟导致部分群体数字排斥，需缩小城乡差距、提升数字素养和普及基础设施，实现数字社会的包容性发展。\\"\\n        ],\\n        \\"b9b4bb28\\": [\\n          \\"伦理与法律问题\\"\\n        ],\\n        \\"67598b22\\": [\\n          \\"零一万物发展带来伦理和法律挑战，需建立规范和法律框架，保障数据合法使用、人工智能透明及就业影响的合理应对。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 10,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"5144e569\\": [\\n          \\"零一万物的未来展望\\"\\n        ],\\n        \\"db5ff530\\": [\\n          \\"人工智能与零一技术的融合\\"\\n        ],\\n        \\"2e7e6eec\\": [\\n          \\"零一技术为人工智能提供基础数据表示与运算方式，推动智能系统实现全链条智能提升。\\"\\n        ],\\n        \\"7f245244\\": [\\n          \\"量子计算对零一体系的影响\\"\\n        ],\\n        \\"bdbde1cb\\": [\\n          \\"量子计算突破传统零一限制，推动经典零一技术与量子计算共存发展，拓展计算能力边界。\\"\\n        ],\\n        \\"0a629dfc\\": [\\n          \\"智能城市与智慧社会的构建\\"\\n        ],\\n        \\"e2197e6e\\": [\\n          \\"零一技术驱动智能城市核心系统，实现智能化管理，提升生活质量与城市运行效率。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 11,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"61d550f6\\": [\\n          \\"总结与思考\\"\\n        ],\\n        \\"86dba575\\": [\\n          \\"零一万物的核心价值回顾\\"\\n        ],\\n        \\"f4abbd51\\": [\\n          \\"零一万物体现了信息的基本单位零和一的潜力，是数字时代的基础概念，驱动数字化转型和产业升级。\\"\\n        ],\\n        \\"4428e62e\\": [\\n          \\"面向未来的数字化思考\\"\\n        ],\\n        \\"cd06c39d\\": [\\n          \\"新兴技术融合推动零一万物应用扩展，数字化转型改变生产生活，需关注公平性和数据安全。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 12,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"33017331\\": [\\n          \\"谢 谢\\"\\n        ]\\n      }\\n    }\\n  }\\n]", "content_type": "markdown", "status": "success", "template_path": "/tmp/doc/uploaded_template_109f091d397042ed_零一万物-光.pptx"}',
                        additional_kwargs: {},
                        response_metadata: {},
                        type: 'tool',
                        name: 'choose_and_read_template_pptx_info',
                        id: '47c60773-a8ec-42a4-966f-7fc775888fcd',
                        tool_call_id: 'tooluse_Zk6nBNkWQSSo41jwhYZKPQ',
                        artifact: null,
                        status: 'success',
                      },
                      status: 'success',
                      param: {
                        pptx_path: '/workspace/upload/零一万物-光.pptx',
                      },
                      action: '正在调用 choose_and_read_template_pptx_info',
                      action_content: '',
                    },
                    timestamp: 1756784071547,
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: '收集零一万物公司的详细信息',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '3',
                title: '规划PPT内容结构和大纲',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '4',
                title: '使用模板创建PPT幻灯片',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '5',
                title: '上传并交付最终PPT文件',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: '分析用户上传的PPT模板结构',
                  status: 'running',
                  started_at: 1756784062580,
                },
                {
                  id: '2',
                  title: '收集零一万物公司的详细信息',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '3',
                  title: '规划PPT内容结构和大纲',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '4',
                  title: '使用模板创建PPT幻灯片',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '5',
                  title: '上传并交付最终PPT文件',
                  status: 'pending',
                  started_at: 1756784062580,
                },
              ],
            },
            timestamp: 1756784062588,
            isLast: true,
          },
        ],
      },
    ]);

    expect(messages).toEqual([
      {
        role: 'user',
        messages: [
          {
            id: '1756784044508_fcb97c02',
            role: 'user',
            type: 'text',
            content: '介绍零一万物',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '零一万物-光.pptx',
                  size: 10000,
                  type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                },
              ],
            },
            timestamp: 1756784044509,
          },
        ],
      },
      {
        role: 'assistant',
        messages: [
          {
            id: '1756784056095_43bb5fcc',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '收到您的请求！我将为您创建一个关于零一万物的PPT介绍。我看到您已经上传了"零一万物-光.pptx"模板文件，我会使用这个模板来制作演示文稿。\n\n让我先分析模板结构，然后收集零一万物的相关信息来创建一个全面的介绍PPT。',
            detail: {
              attachments: [],
              intent_type: 'progress_update',
              scene: 'not_phone',
            },
            timestamp: 1756784056099,
            isLast: true,
          },
          {
            id: '1756784062554_e2988d49',
            role: 'assistant',
            type: 'message_notify_user',
            content:
              '我将按照下列计划进行工作：\n\n1. 分析用户上传的PPT模板结构\n2. 收集零一万物公司的详细信息\n3. 规划PPT内容结构和大纲\n4. 使用模板创建PPT幻灯片\n5. 上传并交付最终PPT文件\n\n在我的工作过程中，你可以随时打断我，告诉我新的信息或者调整计划。',
            detail: {},
            timestamp: 1756784062558,
            isLast: true,
          },
          {
            id: '1756784062580_8bd8162a',
            role: 'assistant',
            type: 'plan',
            content: '创建一个全面介绍零一万物公司的PPT演示文稿，使用用户提供的模板',
            children: [
              {
                id: '1',
                title: '分析用户上传的PPT模板结构',
                status: 'success',
                started_at: 1756784075645,
                children: [
                  {
                    id: '1756784066577_7cde3c6f',
                    role: 'assistant',
                    type: 'choose_and_read_template_pptx_info',
                    content: '',
                    detail: {
                      tool: 'choose_and_read_template_pptx_info',
                      run_id: '981dd306-21b8-4533-ad9e-fdf4d33f22c4',
                      result: {
                        content:
                          '{"content": "[\\n  {\\n    \\"slide_number\\": 1,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"be179f3b\\": [\\n          \\"01AI Presentation\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 2,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"83b517ce\\": [\\n          \\"此处为备注内容\\"\\n        ],\\n        \\"682a9d2a\\": [\\n          \\"此处为段落标题1\\"\\n        ],\\n        \\"64b215f0\\": [\\n          \\"04\\"\\n        ],\\n        \\"19a37359\\": [\\n          \\"此处为备注内容\\"\\n        ],\\n        \\"1aa366ef\\": [\\n          \\"此处为段落标题1\\"\\n        ],\\n        \\"db61c16c\\": [\\n          \\"02\\"\\n        ],\\n        \\"9dd5986c\\": [\\n          \\"此处为备注内容\\"\\n        ],\\n        \\"eb5d339f\\": [\\n          \\"此处为段落标题1\\"\\n        ],\\n        \\"8b642dcc\\": [\\n          \\"03\\"\\n        ],\\n        \\"9e319fcb\\": [\\n          \\"此处为备注内容\\"\\n        ],\\n        \\"ee8da08a\\": [\\n          \\"此处为段落标题1\\"\\n        ],\\n        \\"f2a48842\\": [\\n          \\"01\\"\\n        ],\\n        \\"8351ea2e\\": [\\n          \\"目录\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 3,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"a9775c2a\\": [\\n          \\"零一万物介绍\\"\\n        ],\\n        \\"722f74e7\\": [\\n          \\"“零一万物”基于零和一，通过数字化实现万物互联与智能管理，推动数字化转型和智慧社会建设。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 4,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"f9ee6954\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"c15b6480\\": [\\n          \\"正文标题文案\\"\\n        ],\\n        \\"a34fe09f\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"dcfced38\\": [\\n          \\"AI 2.0 平台\\"\\n        ],\\n        \\"5655a992\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"9f58fe6c\\": [\\n          \\"AI 2.0 平台\\"\\n        ],\\n        \\"4a064350\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"23129021\\": [\\n          \\"AI 2.0 平台\\"\\n        ],\\n        \\"96cc470d\\": [\\n          \\"秉持着坚定的技术愿景和人工智能信仰，零一万物致力打造全新的 AI 2.0平台，将有效帮助提升人类生产力，进而创造巨大的经济价值及社会价值\\"\\n        ],\\n        \\"309ca158\\": [\\n          \\"AI 2.0 平台\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 5,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"eae66713\\": [\\n          \\"零一的哲学与数学意义\\"\\n        ],\\n        \\"14b01155\\": [\\n          \\"零的起源与发展\\"\\n        ],\\n        \\"4b8d5330\\": [\\n          \\"一的象征意义\\"\\n        ],\\n        \\"e1543e6b\\": [\\n          \\"零与一在数学中的基本作用\\"\\n        ],\\n        \\"a1b45b87\\": [\\n          \\"零的概念起源于古代文明，印度数学家将零作为独立数字发明，推动数学体系完善与科学进步。\\"\\n        ],\\n        \\"7d8cb902\\": [\\n          \\"数字一象征统一和起点，是自然数的起始和乘法恒等元，代表整体统一性和万物本源。\\"\\n        ],\\n        \\"75ef77d4\\": [\\n          \\"零和一是数学基石，零为加减法身份元素，一为乘法核心，二者构成数字系统基础，促进计算与信息处理。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 6,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"fc354462\\": [\\n          \\"零一在信息技术中的应用\\"\\n        ],\\n        \\"81c521dc\\": [\\n          \\"二进制系统基础\\"\\n        ],\\n        \\"c9ff1628\\": [\\n          \\"计算机如何使用零和一进行运算\\"\\n        ],\\n        \\"477c00b4\\": [\\n          \\"零一编码与数据存储\\"\\n        ],\\n        \\"903bf9c9\\": [\\n          \\"1\\"\\n        ],\\n        \\"9c00c483\\": [\\n          \\"二进制系统采用零和一两种状态表示所有数据和指令，是计算机及数字设备的核心语言，简化电路设计并确保数据传输准确。\\"\\n        ],\\n        \\"131611a9\\": [\\n          \\"2\\"\\n        ],\\n        \\"7fe0b43b\\": [\\n          \\"计算机将信息转换为二进制代码，通过逻辑门执行算术和逻辑操作，实现复杂数据处理和程序执行。\\"\\n        ],\\n        \\"52f74783\\": [\\n          \\"3\\"\\n        ],\\n        \\"ff45f2a8\\": [\\n          \\"零一编码将信息转换为二进制形式，适合存储和传输，常见编码有ASCII和Unicode，存储设备通过电荷变化保存数据。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 7,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"c5d8ade1\\": [\\n          \\"零一在信息技术中的应用\\"\\n        ],\\n        \\"b0993f80\\": [\\n          \\"数字化万物的实现方式\\"\\n        ],\\n        \\"5e3209a4\\": [\\n          \\"通过传感器采集数据、网络实时传输、云计算存储分析及智能算法决策，实现实体与数字世界的无缝连接。\\"\\n        ],\\n        \\"27103ac8\\": [\\n          \\"物联网中的零一应用\\"\\n        ],\\n        \\"71712164\\": [\\n          \\"零一编码作为二进制基础，确保物联网中数据准确传输和设备高效协作，推动智能家居和智慧城市发展。\\"\\n        ],\\n        \\"de614814\\": [\\n          \\"数字孪生技术简介\\"\\n        ],\\n        \\"31b55279\\": [\\n          \\"利用零一数据与三维建模结合，实现实体设备的实时映射、故障预测和维护优化，促进数字经济融合。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 8,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"dff43bdd\\": [\\n          \\"零一在信息技术中的应用\\"\\n        ],\\n        \\"75d19ee0\\": [\\n          \\"智能生活的普及\\"\\n        ],\\n        \\"c4a426df\\": [\\n          \\"零一技术推动智能家居、智能穿戴和智能交通系统普及，提升生活便捷性和资源利用效率。\\"\\n        ],\\n        \\"00e037d3\\": [\\n          \\"零一技术推动产业变革\\"\\n        ],\\n        \\"b4de8dbb\\": [\\n          \\"零一技术促进制造业智能化、农业精准管理和服务业数字化，推动产业链重塑和经济高质量发展。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 9,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"4b7576d4\\": [\\n          \\"零一万物的挑战与问题\\"\\n        ],\\n        \\"a1ca8c3f\\": [\\n          \\"智能生活的普及\\"\\n        ],\\n        \\"f9176f86\\": [\\n          \\"零一技术推动智能家居、智能穿戴和智能交通系统普及，提升生活便捷性和资源利用效率。\\"\\n        ],\\n        \\"fbec61e5\\": [\\n          \\"技术鸿沟与数字排斥\\"\\n        ],\\n        \\"e77ae3d9\\": [\\n          \\"技术鸿沟导致部分群体数字排斥，需缩小城乡差距、提升数字素养和普及基础设施，实现数字社会的包容性发展。\\"\\n        ],\\n        \\"b9b4bb28\\": [\\n          \\"伦理与法律问题\\"\\n        ],\\n        \\"67598b22\\": [\\n          \\"零一万物发展带来伦理和法律挑战，需建立规范和法律框架，保障数据合法使用、人工智能透明及就业影响的合理应对。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 10,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"5144e569\\": [\\n          \\"零一万物的未来展望\\"\\n        ],\\n        \\"db5ff530\\": [\\n          \\"人工智能与零一技术的融合\\"\\n        ],\\n        \\"2e7e6eec\\": [\\n          \\"零一技术为人工智能提供基础数据表示与运算方式，推动智能系统实现全链条智能提升。\\"\\n        ],\\n        \\"7f245244\\": [\\n          \\"量子计算对零一体系的影响\\"\\n        ],\\n        \\"bdbde1cb\\": [\\n          \\"量子计算突破传统零一限制，推动经典零一技术与量子计算共存发展，拓展计算能力边界。\\"\\n        ],\\n        \\"0a629dfc\\": [\\n          \\"智能城市与智慧社会的构建\\"\\n        ],\\n        \\"e2197e6e\\": [\\n          \\"零一技术驱动智能城市核心系统，实现智能化管理，提升生活质量与城市运行效率。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 11,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"61d550f6\\": [\\n          \\"总结与思考\\"\\n        ],\\n        \\"86dba575\\": [\\n          \\"零一万物的核心价值回顾\\"\\n        ],\\n        \\"f4abbd51\\": [\\n          \\"零一万物体现了信息的基本单位零和一的潜力，是数字时代的基础概念，驱动数字化转型和产业升级。\\"\\n        ],\\n        \\"4428e62e\\": [\\n          \\"面向未来的数字化思考\\"\\n        ],\\n        \\"cd06c39d\\": [\\n          \\"新兴技术融合推动零一万物应用扩展，数字化转型改变生产生活，需关注公平性和数据安全。\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 12,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"33017331\\": [\\n          \\"谢 谢\\"\\n        ]\\n      }\\n    }\\n  }\\n]", "content_type": "markdown", "status": "success", "template_path": "/tmp/doc/uploaded_template_109f091d397042ed_零一万物-光.pptx"}',
                        additional_kwargs: {},
                        response_metadata: {},
                        type: 'tool',
                        name: 'choose_and_read_template_pptx_info',
                        id: '47c60773-a8ec-42a4-966f-7fc775888fcd',
                        tool_call_id: 'tooluse_Zk6nBNkWQSSo41jwhYZKPQ',
                        artifact: null,
                        status: 'success',
                      },
                      status: 'success',
                      param: {
                        pptx_path: '/workspace/upload/零一万物-光.pptx',
                      },
                      action: '正在调用 choose_and_read_template_pptx_info',
                      action_content: '',
                    },
                    timestamp: 1756784071547,
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: '收集零一万物公司的详细信息',
                status: 'running',
                started_at: 1756784075645,
                children: [],
              },
              {
                id: '3',
                title: '规划PPT内容结构和大纲',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '4',
                title: '使用模板创建PPT幻灯片',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '5',
                title: '上传并交付最终PPT文件',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: '分析用户上传的PPT模板结构',
                  status: 'running',
                  started_at: 1756784062580,
                },
                {
                  id: '2',
                  title: '收集零一万物公司的详细信息',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '3',
                  title: '规划PPT内容结构和大纲',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '4',
                  title: '使用模板创建PPT幻灯片',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '5',
                  title: '上传并交付最终PPT文件',
                  status: 'pending',
                  started_at: 1756784062580,
                },
              ],
            },
            timestamp: 1756784062588,
            isLast: true,
          },
        ],
      },
    ]);
  });
});
