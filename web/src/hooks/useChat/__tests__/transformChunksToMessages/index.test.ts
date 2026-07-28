import { describe, it, expect } from 'vitest';
import { pptChunks } from '../mock';
import { getLoadingMessage } from '../../utils';
import { MessageChunk } from '@/types';
import { transformChunksToMessages } from '../../transformChunksToMessages';

describe('transformChunksToMessages', () => {
  it('1', () => {
    const messages = transformChunksToMessages(pptChunks.slice(0, 1) as MessageChunk[]);
    expect(messages).toEqual([
      {
        role: 'user',
        messages: [pptChunks[0] as MessageChunk],
      },
      getLoadingMessage(),
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
            'I\'ll create a new one for you.PPTIntroduction. I see you\'ve uploaded it."01.AI.-Light.pptx"Template file, I\'ll use this template to make presentations.\n\nLet me analyze the template structure and gather all the relevant information for a comprehensive presentation.PPT。',
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
              content: 'Presenting 01.AI.',
              detail: {
                files: [
                  {
                    uid: '1',
                    status: 'done',
                    key: '01AI Light.pptx',
                    url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                    name: '01.AI.-Light.pptx',
                    size: 10000,
                    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  },
                ],
              },
              timestamp: 1756784044509,
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
            id: '1756784044508_fcb97c02',
            role: 'user',
            type: 'text',
            content: 'Presenting 01.AI.',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '01.AI.-Light.pptx',
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
              'I\'ll create a new one for you.PPTIntroduction. I see you\'ve uploaded it."01.AI.-Light.pptx"Template file, I\'ll use this template to make presentations.\n\nLet me analyze the template structure and gather all the relevant information for a comprehensive presentation.PPT。',
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
            'I will proceed according to the following plans:\n\n1. Analyse user uploadsPPTTemplate Structure\n2. Collecting details of the company that owns 01.AI.\n3. PlanningPPTContent structure and outline\n4. Create with TemplatePPTSlide\n5. Upload and deliver finalPPTDocumentation\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
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
              content: 'Presenting 01.AI.',
              detail: {
                files: [
                  {
                    uid: '1',
                    status: 'done',
                    key: '01AI Light.pptx',
                    url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                    name: '01.AI.-Light.pptx',
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
                'I\'ll create a new one for you.PPTIntroduction. I see you\'ve uploaded it."01.AI.-Light.pptx"Template file, I\'ll use this template to make presentations.\n\nLet me analyze the template structure and gather all the relevant information for a comprehensive presentation.PPT。',
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
            content: 'Presenting 01.AI.',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '01.AI.-Light.pptx',
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
              'I\'ll create a new one for you.PPTIntroduction. I see you\'ve uploaded it."01.AI.-Light.pptx"Template file, I\'ll use this template to make presentations.\n\nLet me analyze the template structure and gather all the relevant information for a comprehensive presentation.PPT。',
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
              'I will proceed according to the following plans:\n\n1. Analyse user uploadsPPTTemplate Structure\n2. Collecting details of the company that owns 01.AI.\n3. PlanningPPTContent structure and outline\n4. Create with TemplatePPTSlide\n5. Upload and deliver finalPPTDocumentation\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
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
          content: 'Create a company that will make a comprehensive presentation of the 1010th.PPTPresentation, using user-provided templates',
          detail: {
            steps: [
              {
                id: '1',
                title: 'Analyse user uploadsPPTTemplate Structure',
                status: 'running',
                started_at: 1756784062580,
              },
              {
                id: '2',
                title: 'Collecting details of the company that owns 01.AI.',
                status: 'pending',
                started_at: 1756784062580,
              },
              {
                id: '3',
                title: 'PlanningPPTContent structure and outline',
                status: 'pending',
                started_at: 1756784062580,
              },
              {
                id: '4',
                title: 'Create with TemplatePPTSlide',
                status: 'pending',
                started_at: 1756784062580,
              },
              {
                id: '5',
                title: 'Upload and deliver finalPPTDocumentation',
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
              content: 'Presenting 01.AI.',
              detail: {
                files: [
                  {
                    uid: '1',
                    status: 'done',
                    key: '01AI Light.pptx',
                    url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                    name: '01.AI.-Light.pptx',
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
                'I\'ll create a new one for you.PPTIntroduction. I see you\'ve uploaded it."01.AI.-Light.pptx"Template file, I\'ll use this template to make presentations.\n\nLet me analyze the template structure and gather all the relevant information for a comprehensive presentation.PPT。',
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
                'I will proceed according to the following plans:\n\n1. Analyse user uploadsPPTTemplate Structure\n2. Collecting details of the company that owns 01.AI.\n3. PlanningPPTContent structure and outline\n4. Create with TemplatePPTSlide\n5. Upload and deliver finalPPTDocumentation\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
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
            content: 'Presenting 01.AI.',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '01.AI.-Light.pptx',
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
              'I\'ll create a new one for you.PPTIntroduction. I see you\'ve uploaded it."01.AI.-Light.pptx"Template file, I\'ll use this template to make presentations.\n\nLet me analyze the template structure and gather all the relevant information for a comprehensive presentation.PPT。',
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
              'I will proceed according to the following plans:\n\n1. Analyse user uploadsPPTTemplate Structure\n2. Collecting details of the company that owns 01.AI.\n3. PlanningPPTContent structure and outline\n4. Create with TemplatePPTSlide\n5. Upload and deliver finalPPTDocumentation\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
            detail: {},
            timestamp: 1756784062558,
            isLast: true,
          },
          {
            id: '1756784062580_8bd8162a',
            role: 'assistant',
            type: 'plan',
            content: 'Create a company that will make a comprehensive presentation of the 1010th.PPTPresentation, using user-provided templates',
            children: [
              {
                id: '1',
                title: 'Analyse user uploadsPPTTemplate Structure',
                status: 'running',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '2',
                title: 'Collecting details of the company that owns 01.AI.',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '3',
                title: 'PlanningPPTContent structure and outline',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '4',
                title: 'Create with TemplatePPTSlide',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '5',
                title: 'Upload and deliver finalPPTDocumentation',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Analyse user uploadsPPTTemplate Structure',
                  status: 'running',
                  started_at: 1756784062580,
                },
                {
                  id: '2',
                  title: 'Collecting details of the company that owns 01.AI.',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '3',
                  title: 'PlanningPPTContent structure and outline',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '4',
                  title: 'Create with TemplatePPTSlide',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '5',
                  title: 'Upload and deliver finalPPTDocumentation',
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
              pptx_path: '/workspace/upload/01.AI.-Light.pptx',
            },
            action: 'Calling choose_and_read_template_pptx_info',
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
              content: 'Presenting 01.AI.',
              detail: {
                files: [
                  {
                    uid: '1',
                    status: 'done',
                    key: '01AI Light.pptx',
                    url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                    name: '01.AI.-Light.pptx',
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
                'I\'ll create a new one for you.PPTIntroduction. I see you\'ve uploaded it."01.AI.-Light.pptx"Template file, I\'ll use this template to make presentations.\n\nLet me analyze the template structure and gather all the relevant information for a comprehensive presentation.PPT。',
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
                'I will proceed according to the following plans:\n\n1. Analyse user uploadsPPTTemplate Structure\n2. Collecting details of the company that owns 01.AI.\n3. PlanningPPTContent structure and outline\n4. Create with TemplatePPTSlide\n5. Upload and deliver finalPPTDocumentation\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
              detail: {},
              timestamp: 1756784062558,
              isLast: true,
            },
            {
              id: '1756784062580_8bd8162a',
              role: 'assistant',
              type: 'plan',
              content: 'Create a company that will make a comprehensive presentation of the 1010th.PPTPresentation, using user-provided templates',
              children: [
                {
                  id: '1',
                  title: 'Analyse user uploadsPPTTemplate Structure',
                  status: 'running',
                  started_at: 1756784062580,
                  children: [],
                },
                {
                  id: '2',
                  title: 'Collecting details of the company that owns 01.AI.',
                  status: 'pending',
                  started_at: 1756784062580,
                  children: [],
                },
                {
                  id: '3',
                  title: 'PlanningPPTContent structure and outline',
                  status: 'pending',
                  started_at: 1756784062580,
                  children: [],
                },
                {
                  id: '4',
                  title: 'Create with TemplatePPTSlide',
                  status: 'pending',
                  started_at: 1756784062580,
                  children: [],
                },
                {
                  id: '5',
                  title: 'Upload and deliver finalPPTDocumentation',
                  status: 'pending',
                  started_at: 1756784062580,
                  children: [],
                },
              ],
              detail: {
                steps: [
                  {
                    id: '1',
                    title: 'Analyse user uploadsPPTTemplate Structure',
                    status: 'running',
                    started_at: 1756784062580,
                  },
                  {
                    id: '2',
                    title: 'Collecting details of the company that owns 01.AI.',
                    status: 'pending',
                    started_at: 1756784062580,
                  },
                  {
                    id: '3',
                    title: 'PlanningPPTContent structure and outline',
                    status: 'pending',
                    started_at: 1756784062580,
                  },
                  {
                    id: '4',
                    title: 'Create with TemplatePPTSlide',
                    status: 'pending',
                    started_at: 1756784062580,
                  },
                  {
                    id: '5',
                    title: 'Upload and deliver finalPPTDocumentation',
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
            content: 'Presenting 01.AI.',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '01.AI.-Light.pptx',
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
              'I\'ll create a new one for you.PPTIntroduction. I see you\'ve uploaded it."01.AI.-Light.pptx"Template file, I\'ll use this template to make presentations.\n\nLet me analyze the template structure and gather all the relevant information for a comprehensive presentation.PPT。',
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
              'I will proceed according to the following plans:\n\n1. Analyse user uploadsPPTTemplate Structure\n2. Collecting details of the company that owns 01.AI.\n3. PlanningPPTContent structure and outline\n4. Create with TemplatePPTSlide\n5. Upload and deliver finalPPTDocumentation\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
            detail: {},
            timestamp: 1756784062558,
            isLast: true,
          },
          {
            id: '1756784062580_8bd8162a',
            role: 'assistant',
            type: 'plan',
            content: 'Create a company that will make a comprehensive presentation of the 1010th.PPTPresentation, using user-provided templates',
            children: [
              {
                id: '1',
                title: 'Analyse user uploadsPPTTemplate Structure',
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
                        pptx_path: '/workspace/upload/01.AI.-Light.pptx',
                      },
                      action: 'Calling choose_and_read_template_pptx_info',
                      action_content: '',
                    },
                    timestamp: 1756784071547,
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: 'Collecting details of the company that owns 01.AI.',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '3',
                title: 'PlanningPPTContent structure and outline',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '4',
                title: 'Create with TemplatePPTSlide',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '5',
                title: 'Upload and deliver finalPPTDocumentation',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Analyse user uploadsPPTTemplate Structure',
                  status: 'running',
                  started_at: 1756784062580,
                },
                {
                  id: '2',
                  title: 'Collecting details of the company that owns 01.AI.',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '3',
                  title: 'PlanningPPTContent structure and outline',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '4',
                  title: 'Create with TemplatePPTSlide',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '5',
                  title: 'Upload and deliver finalPPTDocumentation',
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
            content: 'Presenting 01.AI.',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '01.AI.-Light.pptx',
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
              'I\'ll create a new one for you.PPTIntroduction. I see you\'ve uploaded it."01.AI.-Light.pptx"Template file, I\'ll use this template to make presentations.\n\nLet me analyze the template structure and gather all the relevant information for a comprehensive presentation.PPT。',
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
              'I will proceed according to the following plans:\n\n1. Analyse user uploadsPPTTemplate Structure\n2. Collecting details of the company that owns 01.AI.\n3. PlanningPPTContent structure and outline\n4. Create with TemplatePPTSlide\n5. Upload and deliver finalPPTDocumentation\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
            detail: {},
            timestamp: 1756784062558,
            isLast: true,
          },
          {
            id: '1756784062580_8bd8162a',
            role: 'assistant',
            type: 'plan',
            content: 'Create a company that will make a comprehensive presentation of the 1010th.PPTPresentation, using user-provided templates',
            children: [
              {
                id: '1',
                title: 'Analyse user uploadsPPTTemplate Structure',
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
                        pptx_path: '/workspace/upload/01.AI.-Light.pptx',
                      },
                      action: 'Calling choose_and_read_template_pptx_info',
                      action_content: '',
                    },
                    timestamp: 1756784071547,
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: 'Collecting details of the company that owns 01.AI.',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '3',
                title: 'PlanningPPTContent structure and outline',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '4',
                title: 'Create with TemplatePPTSlide',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '5',
                title: 'Upload and deliver finalPPTDocumentation',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Analyse user uploadsPPTTemplate Structure',
                  status: 'running',
                  started_at: 1756784062580,
                },
                {
                  id: '2',
                  title: 'Collecting details of the company that owns 01.AI.',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '3',
                  title: 'PlanningPPTContent structure and outline',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '4',
                  title: 'Create with TemplatePPTSlide',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '5',
                  title: 'Upload and deliver finalPPTDocumentation',
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
            content: 'Presenting 01.AI.',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '01.AI.-Light.pptx',
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
              'I\'ll create a new one for you.PPTIntroduction. I see you\'ve uploaded it."01.AI.-Light.pptx"Template file, I\'ll use this template to make presentations.\n\nLet me analyze the template structure and gather all the relevant information for a comprehensive presentation.PPT。',
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
              'I will proceed according to the following plans:\n\n1. Analyse user uploadsPPTTemplate Structure\n2. Collecting details of the company that owns 01.AI.\n3. PlanningPPTContent structure and outline\n4. Create with TemplatePPTSlide\n5. Upload and deliver finalPPTDocumentation\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
            detail: {},
            timestamp: 1756784062558,
            isLast: true,
          },
          {
            id: '1756784062580_8bd8162a',
            role: 'assistant',
            type: 'plan',
            content: 'Create a company that will make a comprehensive presentation of the 1010th.PPTPresentation, using user-provided templates',
            children: [
              {
                id: '1',
                title: 'Analyse user uploadsPPTTemplate Structure',
                status: 'running',
                started_at: 1756784062580,
                children: [
                  {
                    id: '1756784071572_753e6987',
                    role: 'assistant',
                    type: 'choose_and_read_template_pptx_info',
                    content: '',
                    detail: {
                      tool: 'choose_and_read_template_pptx_info',
                      run_id: '981dd306-21b8-4533-ad9e-fdf4d33f22c4',
                      result: {
                        content:
                          '{"content": "[\\n  {\\n    \\"slide_number\\": 1,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"be179f3b\\": [\\n          \\"01AI Presentation\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 2,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"83b517ce\\": [\\n          \\"This is the content of the remarks\\"\\n        ],\\n        \\"682a9d2a\\": [\\n          \\"This is the paragraph title1\\"\\n        ],\\n        \\"64b215f0\\": [\\n          \\"04\\"\\n        ],\\n        \\"19a37359\\": [\\n          \\"This is the content of the remarks\\"\\n        ],\\n        \\"1aa366ef\\": [\\n          \\"This is the paragraph title1\\"\\n        ],\\n        \\"db61c16c\\": [\\n          \\"02\\"\\n        ],\\n        \\"9dd5986c\\": [\\n          \\"This is the content of the remarks\\"\\n        ],\\n        \\"eb5d339f\\": [\\n          \\"This is the paragraph title1\\"\\n        ],\\n        \\"8b642dcc\\": [\\n          \\"03\\"\\n        ],\\n        \\"9e319fcb\\": [\\n          \\"This is the content of the remarks\\"\\n        ],\\n        \\"ee8da08a\\": [\\n          \\"This is the paragraph title1\\"\\n        ],\\n        \\"f2a48842\\": [\\n          \\"01\\"\\n        ],\\n        \\"8351ea2e\\": [\\n          \\"Contents\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 3,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"a9775c2a\\": [\\n          \\"The introduction to the 101st.\\"\\n        ],\\n        \\"722f74e7\\": [\\n          \\"“01.AI.”• Digitalization, based on zero and one, to connect and manage everything with intelligence, and to promote digital transformation and intellectual social building.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 4,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"f9ee6954\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platform, which will effectively help to raise human productivity and thus create huge economic and social values with a strong technological vision and artificial intelligence belief, and zero things dedicated to building a whole new one AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"c15b6480\\": [\\n          \\"Text Titles\\"\\n        ],\\n        \\"a34fe09f\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"dcfced38\\": [\\n          \\"AI 2.0 Platform\\"\\n        ],\\n        \\"5655a992\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"9f58fe6c\\": [\\n          \\"AI 2.0 Platform\\"\\n        ],\\n        \\"4a064350\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"23129021\\": [\\n          \\"AI 2.0 Platform\\"\\n        ],\\n        \\"96cc470d\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"309ca158\\": [\\n          \\"AI 2.0 Platform\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 5,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"eae66713\\": [\\n          \\"The Philosophy and Maths Meaning of 01\\"\\n        ],\\n        \\"14b01155\\": [\\n          \\"Zero Origin and Development\\"\\n        ],\\n        \\"4b8d5330\\": [\\n          \\"The symbolism of the first.\\"\\n        ],\\n        \\"e1543e6b\\": [\\n          \\"Zero and one in mathematics.\\"\\n        ],\\n        \\"a1b45b87\\": [\\n          \\"The concept of zero is rooted in ancient civilization, where Indian mathematicians use zero as an independent digital invention to promote the improvement of the mathematical system and scientific progress.\\"\\n        ],\\n        \\"7d8cb902\\": [\\n          \\"The first symbol of unity and starting point of a number is the beginning and multiplication of the natural number, representing the unity of the whole and the source of all things.\\"\\n        ],\\n        \\"75ef77d4\\": [\\n          \\"The zero and one are mathematical building blocks, zero are plus and minus elements of identity, and one is the multiplication core, which forms the basis of the digital system and facilitates computing and information processing.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 6,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"fc354462\\": [\\n          \\"Zero-one applications in information technology\\"\\n        ],\\n        \\"81c521dc\\": [\\n          \\"Binary system base\\"\\n        ],\\n        \\"c9ff1628\\": [\\n          \\"How computers operate with zero and one.\\"\\n        ],\\n        \\"477c00b4\\": [\\n          \\"Zero Encoding and Data Storage\\"\\n        ],\\n        \\"903bf9c9\\": [\\n          \\"1\\"\\n        ],\\n        \\"9c00c483\\": [\\n          \\"The binary system, which expresses all data and instructions in zero and one or two states, is the core language of computers and digital equipment, simplifys circuit design and ensures accurate data transmission.\\"\\n        ],\\n        \\"131611a9\\": [\\n          \\"2\\"\\n        ],\\n        \\"7fe0b43b\\": [\\n          \\"Computers convert information to binary codes, perform arithmetic and logical operations through the logical door, and achieve complex data processing and program execution.\\"\\n        ],\\n        \\"52f74783\\": [\\n          \\"3\\"\\n        ],\\n        \\"ff45f2a8\\": [\\n          \\"The 01 code converts information to binary format suitable for storage and transmission, and common code is availableASCIIandUnicode，Storage devices preserve data through charge change.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 7,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"c5d8ade1\\": [\\n          \\"Zero-one applications in information technology\\"\\n        ],\\n        \\"b0993f80\\": [\\n          \\"The way things are digitally realized.\\"\\n        ],\\n        \\"5e3209a4\\": [\\n          \\"The seamless connection of entities to the digital world is achieved through sensor collection of data, real-time network transmission, cloud computing storage analysis and smart algorithm decision-making.\\"\\n        ],\\n        \\"27103ac8\\": [\\n          \\"101 applications in the Internet\\"\\n        ],\\n        \\"71712164\\": [\\n          \\"The 01 Code serves as the basis for binary development, ensuring the accurate transmission of data and efficient collaboration of equipment in the Internet of goods, and promoting intelligent home and intelligent urban development.\\"\\n        ],\\n        \\"de614814\\": [\\n          \\"Digital twinning technology profile\\"\\n        ],\\n        \\"31b55279\\": [\\n          \\"The integration of the digital economy is facilitated by the use of zero data combined with three-dimensional modelling to optimize real-time mapping, failure prediction and maintenance of physical equipment.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 8,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"dff43bdd\\": [\\n          \\"Zero-one applications in information technology\\"\\n        ],\\n        \\"75d19ee0\\": [\\n          \\"The spread of intelligent life\\"\\n        ],\\n        \\"c4a426df\\": [\\n          \\"The zero one technology promotes intelligent home, intelligent clothing and universal access to intelligent transport systems, improving the accessibility of life and resource efficiency.\\"\\n        ],\\n        \\"00e037d3\\": [\\n          \\"Zero One Technology for Industrial Change\\"\\n        ],\\n        \\"b4de8dbb\\": [\\n          \\"The zero-one technology promotes manufacturing intelligence, precision management in agriculture and digitalization of services, and the re-establishment of industrial chains and high-quality economic development.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 9,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"4b7576d4\\": [\\n          \\"The challenges and problems of 01.AI.\\"\\n        ],\\n        \\"a1ca8c3f\\": [\\n          \\"The spread of intelligent life\\"\\n        ],\\n        \\"f9176f86\\": [\\n          \\"The zero one technology promotes intelligent home, intelligent clothing and universal access to intelligent transport systems, improving the accessibility of life and resource efficiency.\\"\\n        ],\\n        \\"fbec61e5\\": [\\n          \\"Technological divide and digital exclusion\\"\\n        ],\\n        \\"e77ae3d9\\": [\\n          \\"The technological divide, which leads to the digital exclusion of some groups, requires the reduction of the urban-rural gap, the upgrading of digital literacy and the expansion of infrastructure to achieve inclusive development in a digital society.\\"\\n        ],\\n        \\"b9b4bb28\\": [\\n          \\"Ethical and legal issues\\"\\n        ],\\n        \\"67598b22\\": [\\n          \\"Development of zero-sum objects presents ethical and legal challenges, requiring the establishment of regulatory and legal frameworks that guarantee the legitimate use of data, the transparency of artificial intelligence and a rational response to the effects of employment.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 10,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"5144e569\\": [\\n          \\"The future of 01.AI.\\"\\n        ],\\n        \\"db5ff530\\": [\\n          \\"Integration of artificial intelligence with the one technology\\"\\n        ],\\n        \\"2e7e6eec\\": [\\n          \\"The zero one technology provides the basic data expression and computing of artificial intelligence and promotes the upgrading of the intelligence system through the chain.\\"\\n        ],\\n        \\"7f245244\\": [\\n          \\"Impact of quantum calculations on the 101 system\\"\\n        ],\\n        \\"bdbde1cb\\": [\\n          \\"Quantum computing has broken the traditional 01 limit, promoting the development of classic Zero-one technologies and quantum computing in combination, and expanding the boundaries of computing capabilities.\\"\\n        ],\\n        \\"0a629dfc\\": [\\n          \\"Smart cities and the construction of intelligent societies\\"\\n        ],\\n        \\"e2197e6e\\": [\\n          \\"Zero-one technology drives the smart city core system to achieve intelligent management and improve quality of life and the efficiency of urban operations.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 11,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"61d550f6\\": [\\n          \\"Summary and reflection\\"\\n        ],\\n        \\"86dba575\\": [\\n          \\"A review of the core values of 01.AI.\\"\\n        ],\\n        \\"f4abbd51\\": [\\n          \\"The zero-sum potential of the basic unit of information is reflected in the underlying concepts of the digital age, driving the digital transformation and industrial upgrading.\\"\\n        ],\\n        \\"4428e62e\\": [\\n          \\"Digital thinking for the future\\"\\n        ],\\n        \\"cd06c39d\\": [\\n          \\"The integration of emerging technologies has driven the expansion of the application of 101 things, and digital transformations have transformed productive life, with attention to equity and data security.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 12,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"33017331\\": [\\n          \\"Thank you.\\"\\n        ]\\n      }\\n    }\\n  }\\n]", "content_type": "markdown", "status": "success", "template_path": "/tmp/doc/uploaded_template_109f091d397042ed_01.AI.-Light.pptx"}',
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
                        pptx_path: '/workspace/upload/01.AI.-Light.pptx',
                      },
                      action: 'Calling choose_and_read_template_pptx_info',
                      action_content: '',
                    },
                    timestamp: 1756784071578,
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: 'Collecting details of the company that owns 01.AI.',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '3',
                title: 'PlanningPPTContent structure and outline',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '4',
                title: 'Create with TemplatePPTSlide',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '5',
                title: 'Upload and deliver finalPPTDocumentation',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Analyse user uploadsPPTTemplate Structure',
                  status: 'running',
                  started_at: 1756784062580,
                },
                {
                  id: '2',
                  title: 'Collecting details of the company that owns 01.AI.',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '3',
                  title: 'PlanningPPTContent structure and outline',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '4',
                  title: 'Create with TemplatePPTSlide',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '5',
                  title: 'Upload and deliver finalPPTDocumentation',
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
            content: 'Presenting 01.AI.',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '01.AI.-Light.pptx',
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
              'I\'ll create a new one for you.PPTIntroduction. I see you\'ve uploaded it."01.AI.-Light.pptx"Template file, I\'ll use this template to make presentations.\n\nLet me analyze the template structure and gather all the relevant information for a comprehensive presentation.PPT。',
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
              'I will proceed according to the following plans:\n\n1. Analyse user uploadsPPTTemplate Structure\n2. Collecting details of the company that owns 01.AI.\n3. PlanningPPTContent structure and outline\n4. Create with TemplatePPTSlide\n5. Upload and deliver finalPPTDocumentation\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
            detail: {},
            timestamp: 1756784062558,
            isLast: true,
          },
          {
            id: '1756784062580_8bd8162a',
            role: 'assistant',
            type: 'plan',
            content: 'Create a company that will make a comprehensive presentation of the 1010th.PPTPresentation, using user-provided templates',
            children: [
              {
                id: '1',
                title: 'Analyse user uploadsPPTTemplate Structure',
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
                          '{"content": "[\\n  {\\n    \\"slide_number\\": 1,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"be179f3b\\": [\\n          \\"01AI Presentation\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 2,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"83b517ce\\": [\\n          \\"This is the content of the remarks\\"\\n        ],\\n        \\"682a9d2a\\": [\\n          \\"This is the paragraph title1\\"\\n        ],\\n        \\"64b215f0\\": [\\n          \\"04\\"\\n        ],\\n        \\"19a37359\\": [\\n          \\"This is the content of the remarks\\"\\n        ],\\n        \\"1aa366ef\\": [\\n          \\"This is the paragraph title1\\"\\n        ],\\n        \\"db61c16c\\": [\\n          \\"02\\"\\n        ],\\n        \\"9dd5986c\\": [\\n          \\"This is the content of the remarks\\"\\n        ],\\n        \\"eb5d339f\\": [\\n          \\"This is the paragraph title1\\"\\n        ],\\n        \\"8b642dcc\\": [\\n          \\"03\\"\\n        ],\\n        \\"9e319fcb\\": [\\n          \\"This is the content of the remarks\\"\\n        ],\\n        \\"ee8da08a\\": [\\n          \\"This is the paragraph title1\\"\\n        ],\\n        \\"f2a48842\\": [\\n          \\"01\\"\\n        ],\\n        \\"8351ea2e\\": [\\n          \\"Contents\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 3,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"a9775c2a\\": [\\n          \\"The introduction to the 101st.\\"\\n        ],\\n        \\"722f74e7\\": [\\n          \\"“01.AI.”• Digitalization, based on zero and one, to connect and manage everything with intelligence, and to promote digital transformation and intellectual social building.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 4,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"f9ee6954\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platform, which will effectively help to raise human productivity and thus create huge economic and social values with a strong technological vision and artificial intelligence belief, and zero things dedicated to building a whole new one AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"c15b6480\\": [\\n          \\"Text Titles\\"\\n        ],\\n        \\"a34fe09f\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"dcfced38\\": [\\n          \\"AI 2.0 Platform\\"\\n        ],\\n        \\"5655a992\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"9f58fe6c\\": [\\n          \\"AI 2.0 Platform\\"\\n        ],\\n        \\"4a064350\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"23129021\\": [\\n          \\"AI 2.0 Platform\\"\\n        ],\\n        \\"96cc470d\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"309ca158\\": [\\n          \\"AI 2.0 Platform\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 5,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"eae66713\\": [\\n          \\"The Philosophy and Maths Meaning of 01\\"\\n        ],\\n        \\"14b01155\\": [\\n          \\"Zero Origin and Development\\"\\n        ],\\n        \\"4b8d5330\\": [\\n          \\"The symbolism of the first.\\"\\n        ],\\n        \\"e1543e6b\\": [\\n          \\"Zero and one in mathematics.\\"\\n        ],\\n        \\"a1b45b87\\": [\\n          \\"The concept of zero is rooted in ancient civilization, where Indian mathematicians use zero as an independent digital invention to promote the improvement of the mathematical system and scientific progress.\\"\\n        ],\\n        \\"7d8cb902\\": [\\n          \\"The first symbol of unity and starting point of a number is the beginning and multiplication of the natural number, representing the unity of the whole and the source of all things.\\"\\n        ],\\n        \\"75ef77d4\\": [\\n          \\"The zero and one are mathematical building blocks, zero are plus and minus elements of identity, and one is the multiplication core, which forms the basis of the digital system and facilitates computing and information processing.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 6,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"fc354462\\": [\\n          \\"Zero-one applications in information technology\\"\\n        ],\\n        \\"81c521dc\\": [\\n          \\"Binary system base\\"\\n        ],\\n        \\"c9ff1628\\": [\\n          \\"How computers operate with zero and one.\\"\\n        ],\\n        \\"477c00b4\\": [\\n          \\"Zero Encoding and Data Storage\\"\\n        ],\\n        \\"903bf9c9\\": [\\n          \\"1\\"\\n        ],\\n        \\"9c00c483\\": [\\n          \\"The binary system, which expresses all data and instructions in zero and one or two states, is the core language of computers and digital equipment, simplifys circuit design and ensures accurate data transmission.\\"\\n        ],\\n        \\"131611a9\\": [\\n          \\"2\\"\\n        ],\\n        \\"7fe0b43b\\": [\\n          \\"Computers convert information to binary codes, perform arithmetic and logical operations through the logical door, and achieve complex data processing and program execution.\\"\\n        ],\\n        \\"52f74783\\": [\\n          \\"3\\"\\n        ],\\n        \\"ff45f2a8\\": [\\n          \\"The 01 code converts information to binary format suitable for storage and transmission, and common code is availableASCIIandUnicode，Storage devices preserve data through charge change.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 7,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"c5d8ade1\\": [\\n          \\"Zero-one applications in information technology\\"\\n        ],\\n        \\"b0993f80\\": [\\n          \\"The way things are digitally realized.\\"\\n        ],\\n        \\"5e3209a4\\": [\\n          \\"The seamless connection of entities to the digital world is achieved through sensor collection of data, real-time network transmission, cloud computing storage analysis and smart algorithm decision-making.\\"\\n        ],\\n        \\"27103ac8\\": [\\n          \\"101 applications in the Internet\\"\\n        ],\\n        \\"71712164\\": [\\n          \\"The 01 Code serves as the basis for binary development, ensuring the accurate transmission of data and efficient collaboration of equipment in the Internet of goods, and promoting intelligent home and intelligent urban development.\\"\\n        ],\\n        \\"de614814\\": [\\n          \\"Digital twinning technology profile\\"\\n        ],\\n        \\"31b55279\\": [\\n          \\"The integration of the digital economy is facilitated by the use of zero data combined with three-dimensional modelling to optimize real-time mapping, failure prediction and maintenance of physical equipment.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 8,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"dff43bdd\\": [\\n          \\"Zero-one applications in information technology\\"\\n        ],\\n        \\"75d19ee0\\": [\\n          \\"The spread of intelligent life\\"\\n        ],\\n        \\"c4a426df\\": [\\n          \\"The zero one technology promotes intelligent home, intelligent clothing and universal access to intelligent transport systems, improving the accessibility of life and resource efficiency.\\"\\n        ],\\n        \\"00e037d3\\": [\\n          \\"Zero One Technology for Industrial Change\\"\\n        ],\\n        \\"b4de8dbb\\": [\\n          \\"The zero-one technology promotes manufacturing intelligence, precision management in agriculture and digitalization of services, and the re-establishment of industrial chains and high-quality economic development.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 9,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"4b7576d4\\": [\\n          \\"The challenges and problems of 01.AI.\\"\\n        ],\\n        \\"a1ca8c3f\\": [\\n          \\"The spread of intelligent life\\"\\n        ],\\n        \\"f9176f86\\": [\\n          \\"The zero one technology promotes intelligent home, intelligent clothing and universal access to intelligent transport systems, improving the accessibility of life and resource efficiency.\\"\\n        ],\\n        \\"fbec61e5\\": [\\n          \\"Technological divide and digital exclusion\\"\\n        ],\\n        \\"e77ae3d9\\": [\\n          \\"The technological divide, which leads to the digital exclusion of some groups, requires the reduction of the urban-rural gap, the upgrading of digital literacy and the expansion of infrastructure to achieve inclusive development in a digital society.\\"\\n        ],\\n        \\"b9b4bb28\\": [\\n          \\"Ethical and legal issues\\"\\n        ],\\n        \\"67598b22\\": [\\n          \\"Development of zero-sum objects presents ethical and legal challenges, requiring the establishment of regulatory and legal frameworks that guarantee the legitimate use of data, the transparency of artificial intelligence and a rational response to the effects of employment.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 10,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"5144e569\\": [\\n          \\"The future of 01.AI.\\"\\n        ],\\n        \\"db5ff530\\": [\\n          \\"Integration of artificial intelligence with the one technology\\"\\n        ],\\n        \\"2e7e6eec\\": [\\n          \\"The zero one technology provides the basic data expression and computing of artificial intelligence and promotes the upgrading of the intelligence system through the chain.\\"\\n        ],\\n        \\"7f245244\\": [\\n          \\"Impact of quantum calculations on the 101 system\\"\\n        ],\\n        \\"bdbde1cb\\": [\\n          \\"Quantum computing has broken the traditional 01 limit, promoting the development of classic Zero-one technologies and quantum computing in combination, and expanding the boundaries of computing capabilities.\\"\\n        ],\\n        \\"0a629dfc\\": [\\n          \\"Smart cities and the construction of intelligent societies\\"\\n        ],\\n        \\"e2197e6e\\": [\\n          \\"Zero-one technology drives the smart city core system to achieve intelligent management and improve quality of life and the efficiency of urban operations.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 11,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"61d550f6\\": [\\n          \\"Summary and reflection\\"\\n        ],\\n        \\"86dba575\\": [\\n          \\"A review of the core values of 01.AI.\\"\\n        ],\\n        \\"f4abbd51\\": [\\n          \\"The zero-sum potential of the basic unit of information is reflected in the underlying concepts of the digital age, driving the digital transformation and industrial upgrading.\\"\\n        ],\\n        \\"4428e62e\\": [\\n          \\"Digital thinking for the future\\"\\n        ],\\n        \\"cd06c39d\\": [\\n          \\"The integration of emerging technologies has driven the expansion of the application of 101 things, and digital transformations have transformed productive life, with attention to equity and data security.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 12,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"33017331\\": [\\n          \\"Thank you.\\"\\n        ]\\n      }\\n    }\\n  }\\n]", "content_type": "markdown", "status": "success", "template_path": "/tmp/doc/uploaded_template_109f091d397042ed_01.AI.-Light.pptx"}',
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
                        pptx_path: '/workspace/upload/01.AI.-Light.pptx',
                      },
                      action: 'Calling choose_and_read_template_pptx_info',
                      action_content: '',
                    },
                    timestamp: 1756784071547,
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: 'Collecting details of the company that owns 01.AI.',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '3',
                title: 'PlanningPPTContent structure and outline',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '4',
                title: 'Create with TemplatePPTSlide',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '5',
                title: 'Upload and deliver finalPPTDocumentation',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Analyse user uploadsPPTTemplate Structure',
                  status: 'running',
                  started_at: 1756784062580,
                },
                {
                  id: '2',
                  title: 'Collecting details of the company that owns 01.AI.',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '3',
                  title: 'PlanningPPTContent structure and outline',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '4',
                  title: 'Create with TemplatePPTSlide',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '5',
                  title: 'Upload and deliver finalPPTDocumentation',
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
            content: 'Presenting 01.AI.',
            detail: {
              files: [
                {
                  uid: '1',
                  status: 'done',
                  key: '01AI Light.pptx',
                  url: 'https://productivity-console-prod-sh.oss-cn-shanghai.aliyuncs.com/ppt_info/01AI Light.pptx',
                  name: '01.AI.-Light.pptx',
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
              'I\'ll create a new one for you.PPTIntroduction. I see you\'ve uploaded it."01.AI.-Light.pptx"Template file, I\'ll use this template to make presentations.\n\nLet me analyze the template structure and gather all the relevant information for a comprehensive presentation.PPT。',
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
              'I will proceed according to the following plans:\n\n1. Analyse user uploadsPPTTemplate Structure\n2. Collecting details of the company that owns 01.AI.\n3. PlanningPPTContent structure and outline\n4. Create with TemplatePPTSlide\n5. Upload and deliver finalPPTDocumentation\n\nIn the course of my work, you can interrupt me at any time, give me new information or adjust the plan.',
            detail: {},
            timestamp: 1756784062558,
            isLast: true,
          },
          {
            id: '1756784062580_8bd8162a',
            role: 'assistant',
            type: 'plan',
            content: 'Create a company that will make a comprehensive presentation of the 1010th.PPTPresentation, using user-provided templates',
            children: [
              {
                id: '1',
                title: 'Analyse user uploadsPPTTemplate Structure',
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
                          '{"content": "[\\n  {\\n    \\"slide_number\\": 1,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"be179f3b\\": [\\n          \\"01AI Presentation\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 2,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"83b517ce\\": [\\n          \\"This is the content of the remarks\\"\\n        ],\\n        \\"682a9d2a\\": [\\n          \\"This is the paragraph title1\\"\\n        ],\\n        \\"64b215f0\\": [\\n          \\"04\\"\\n        ],\\n        \\"19a37359\\": [\\n          \\"This is the content of the remarks\\"\\n        ],\\n        \\"1aa366ef\\": [\\n          \\"This is the paragraph title1\\"\\n        ],\\n        \\"db61c16c\\": [\\n          \\"02\\"\\n        ],\\n        \\"9dd5986c\\": [\\n          \\"This is the content of the remarks\\"\\n        ],\\n        \\"eb5d339f\\": [\\n          \\"This is the paragraph title1\\"\\n        ],\\n        \\"8b642dcc\\": [\\n          \\"03\\"\\n        ],\\n        \\"9e319fcb\\": [\\n          \\"This is the content of the remarks\\"\\n        ],\\n        \\"ee8da08a\\": [\\n          \\"This is the paragraph title1\\"\\n        ],\\n        \\"f2a48842\\": [\\n          \\"01\\"\\n        ],\\n        \\"8351ea2e\\": [\\n          \\"Contents\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 3,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"a9775c2a\\": [\\n          \\"The introduction to the 101st.\\"\\n        ],\\n        \\"722f74e7\\": [\\n          \\"“01.AI.”• Digitalization, based on zero and one, to connect and manage everything with intelligence, and to promote digital transformation and intellectual social building.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 4,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"f9ee6954\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platform, which will effectively help to raise human productivity and thus create huge economic and social values with a strong technological vision and artificial intelligence belief, and zero things dedicated to building a whole new one AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"c15b6480\\": [\\n          \\"Text Titles\\"\\n        ],\\n        \\"a34fe09f\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"dcfced38\\": [\\n          \\"AI 2.0 Platform\\"\\n        ],\\n        \\"5655a992\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"9f58fe6c\\": [\\n          \\"AI 2.0 Platform\\"\\n        ],\\n        \\"4a064350\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"23129021\\": [\\n          \\"AI 2.0 Platform\\"\\n        ],\\n        \\"96cc470d\\": [\\n          \\"With a strong technological vision and artificial intelligence, 01.AI things are dedicated to building a new one. AI 2.0Platforms that will effectively help to raise human productivity and thus create significant economic and social values\\"\\n        ],\\n        \\"309ca158\\": [\\n          \\"AI 2.0 Platform\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 5,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"eae66713\\": [\\n          \\"The Philosophy and Maths Meaning of 01\\"\\n        ],\\n        \\"14b01155\\": [\\n          \\"Zero Origin and Development\\"\\n        ],\\n        \\"4b8d5330\\": [\\n          \\"The symbolism of the first.\\"\\n        ],\\n        \\"e1543e6b\\": [\\n          \\"Zero and one in mathematics.\\"\\n        ],\\n        \\"a1b45b87\\": [\\n          \\"The concept of zero is rooted in ancient civilization, where Indian mathematicians use zero as an independent digital invention to promote the improvement of the mathematical system and scientific progress.\\"\\n        ],\\n        \\"7d8cb902\\": [\\n          \\"The first symbol of unity and starting point of a number is the beginning and multiplication of the natural number, representing the unity of the whole and the source of all things.\\"\\n        ],\\n        \\"75ef77d4\\": [\\n          \\"The zero and one are mathematical building blocks, zero are plus and minus elements of identity, and one is the multiplication core, which forms the basis of the digital system and facilitates computing and information processing.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 6,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"fc354462\\": [\\n          \\"Zero-one applications in information technology\\"\\n        ],\\n        \\"81c521dc\\": [\\n          \\"Binary system base\\"\\n        ],\\n        \\"c9ff1628\\": [\\n          \\"How computers operate with zero and one.\\"\\n        ],\\n        \\"477c00b4\\": [\\n          \\"Zero Encoding and Data Storage\\"\\n        ],\\n        \\"903bf9c9\\": [\\n          \\"1\\"\\n        ],\\n        \\"9c00c483\\": [\\n          \\"The binary system, which expresses all data and instructions in zero and one or two states, is the core language of computers and digital equipment, simplifys circuit design and ensures accurate data transmission.\\"\\n        ],\\n        \\"131611a9\\": [\\n          \\"2\\"\\n        ],\\n        \\"7fe0b43b\\": [\\n          \\"Computers convert information to binary codes, perform arithmetic and logical operations through the logical door, and achieve complex data processing and program execution.\\"\\n        ],\\n        \\"52f74783\\": [\\n          \\"3\\"\\n        ],\\n        \\"ff45f2a8\\": [\\n          \\"The 01 code converts information to binary format suitable for storage and transmission, and common code is availableASCIIandUnicode，Storage devices preserve data through charge change.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 7,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"c5d8ade1\\": [\\n          \\"Zero-one applications in information technology\\"\\n        ],\\n        \\"b0993f80\\": [\\n          \\"The way things are digitally realized.\\"\\n        ],\\n        \\"5e3209a4\\": [\\n          \\"The seamless connection of entities to the digital world is achieved through sensor collection of data, real-time network transmission, cloud computing storage analysis and smart algorithm decision-making.\\"\\n        ],\\n        \\"27103ac8\\": [\\n          \\"101 applications in the Internet\\"\\n        ],\\n        \\"71712164\\": [\\n          \\"The 01 Code serves as the basis for binary development, ensuring the accurate transmission of data and efficient collaboration of equipment in the Internet of goods, and promoting intelligent home and intelligent urban development.\\"\\n        ],\\n        \\"de614814\\": [\\n          \\"Digital twinning technology profile\\"\\n        ],\\n        \\"31b55279\\": [\\n          \\"The integration of the digital economy is facilitated by the use of zero data combined with three-dimensional modelling to optimize real-time mapping, failure prediction and maintenance of physical equipment.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 8,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"dff43bdd\\": [\\n          \\"Zero-one applications in information technology\\"\\n        ],\\n        \\"75d19ee0\\": [\\n          \\"The spread of intelligent life\\"\\n        ],\\n        \\"c4a426df\\": [\\n          \\"The zero one technology promotes intelligent home, intelligent clothing and universal access to intelligent transport systems, improving the accessibility of life and resource efficiency.\\"\\n        ],\\n        \\"00e037d3\\": [\\n          \\"Zero One Technology for Industrial Change\\"\\n        ],\\n        \\"b4de8dbb\\": [\\n          \\"The zero-one technology promotes manufacturing intelligence, precision management in agriculture and digitalization of services, and the re-establishment of industrial chains and high-quality economic development.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 9,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"4b7576d4\\": [\\n          \\"The challenges and problems of 01.AI.\\"\\n        ],\\n        \\"a1ca8c3f\\": [\\n          \\"The spread of intelligent life\\"\\n        ],\\n        \\"f9176f86\\": [\\n          \\"The zero one technology promotes intelligent home, intelligent clothing and universal access to intelligent transport systems, improving the accessibility of life and resource efficiency.\\"\\n        ],\\n        \\"fbec61e5\\": [\\n          \\"Technological divide and digital exclusion\\"\\n        ],\\n        \\"e77ae3d9\\": [\\n          \\"The technological divide, which leads to the digital exclusion of some groups, requires the reduction of the urban-rural gap, the upgrading of digital literacy and the expansion of infrastructure to achieve inclusive development in a digital society.\\"\\n        ],\\n        \\"b9b4bb28\\": [\\n          \\"Ethical and legal issues\\"\\n        ],\\n        \\"67598b22\\": [\\n          \\"Development of zero-sum objects presents ethical and legal challenges, requiring the establishment of regulatory and legal frameworks that guarantee the legitimate use of data, the transparency of artificial intelligence and a rational response to the effects of employment.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 10,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"5144e569\\": [\\n          \\"The future of 01.AI.\\"\\n        ],\\n        \\"db5ff530\\": [\\n          \\"Integration of artificial intelligence with the one technology\\"\\n        ],\\n        \\"2e7e6eec\\": [\\n          \\"The zero one technology provides the basic data expression and computing of artificial intelligence and promotes the upgrading of the intelligence system through the chain.\\"\\n        ],\\n        \\"7f245244\\": [\\n          \\"Impact of quantum calculations on the 101 system\\"\\n        ],\\n        \\"bdbde1cb\\": [\\n          \\"Quantum computing has broken the traditional 01 limit, promoting the development of classic Zero-one technologies and quantum computing in combination, and expanding the boundaries of computing capabilities.\\"\\n        ],\\n        \\"0a629dfc\\": [\\n          \\"Smart cities and the construction of intelligent societies\\"\\n        ],\\n        \\"e2197e6e\\": [\\n          \\"Zero-one technology drives the smart city core system to achieve intelligent management and improve quality of life and the efficiency of urban operations.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 11,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"61d550f6\\": [\\n          \\"Summary and reflection\\"\\n        ],\\n        \\"86dba575\\": [\\n          \\"A review of the core values of 01.AI.\\"\\n        ],\\n        \\"f4abbd51\\": [\\n          \\"The zero-sum potential of the basic unit of information is reflected in the underlying concepts of the digital age, driving the digital transformation and industrial upgrading.\\"\\n        ],\\n        \\"4428e62e\\": [\\n          \\"Digital thinking for the future\\"\\n        ],\\n        \\"cd06c39d\\": [\\n          \\"The integration of emerging technologies has driven the expansion of the application of 101 things, and digital transformations have transformed productive life, with attention to equity and data security.\\"\\n        ]\\n      }\\n    }\\n  },\\n  {\\n    \\"slide_number\\": 12,\\n    \\"replace_content\\": {\\n      \\"text\\": {\\n        \\"33017331\\": [\\n          \\"Thank you.\\"\\n        ]\\n      }\\n    }\\n  }\\n]", "content_type": "markdown", "status": "success", "template_path": "/tmp/doc/uploaded_template_109f091d397042ed_01.AI.-Light.pptx"}',
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
                        pptx_path: '/workspace/upload/01.AI.-Light.pptx',
                      },
                      action: 'Calling choose_and_read_template_pptx_info',
                      action_content: '',
                    },
                    timestamp: 1756784071547,
                    isLast: true,
                  },
                ],
              },
              {
                id: '2',
                title: 'Collecting details of the company that owns 01.AI.',
                status: 'running',
                started_at: 1756784075645,
                children: [],
              },
              {
                id: '3',
                title: 'PlanningPPTContent structure and outline',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '4',
                title: 'Create with TemplatePPTSlide',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
              {
                id: '5',
                title: 'Upload and deliver finalPPTDocumentation',
                status: 'pending',
                started_at: 1756784062580,
                children: [],
              },
            ],
            detail: {
              steps: [
                {
                  id: '1',
                  title: 'Analyse user uploadsPPTTemplate Structure',
                  status: 'running',
                  started_at: 1756784062580,
                },
                {
                  id: '2',
                  title: 'Collecting details of the company that owns 01.AI.',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '3',
                  title: 'PlanningPPTContent structure and outline',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '4',
                  title: 'Create with TemplatePPTSlide',
                  status: 'pending',
                  started_at: 1756784062580,
                },
                {
                  id: '5',
                  title: 'Upload and deliver finalPPTDocumentation',
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
