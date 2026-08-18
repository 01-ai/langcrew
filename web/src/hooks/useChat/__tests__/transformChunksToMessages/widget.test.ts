import { describe, it, expect } from 'vitest';
import { MessageChunk } from '@/types';
import { findIndex } from 'lodash-es';
import { transformChunksToMessages } from '../../transformChunksToMessages';

const chunks = [
  {
    id: '1764052113555_7f510b94',
    role: 'user',
    type: 'text',
    content: '我要投保',
    detail: {},
    timestamp: 1764052113555,
    trace_id: null,
    trace_base_url: 'https://trace.example.test',
    step_id: null,
    is_llm_message: false,
    session_id: '1d0b58c2c65249eb',
  },
  {
    id: '1764052119298_qftt',
    role: 'assistant',
    type: 'text',
    content: '我来',
    detail: { streaming: true, run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5' },
    timestamp: 1764052119298,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052119300_otsz',
    role: 'assistant',
    type: 'text',
    content: '为',
    detail: { streaming: true, run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5' },
    timestamp: 1764052119300,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052119301_pu3q',
    role: 'assistant',
    type: 'text',
    content: '您创',
    detail: { streaming: true, run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5' },
    timestamp: 1764052119301,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052119302_4g8s',
    role: 'assistant',
    type: 'text',
    content: '建一个保',
    detail: { streaming: true, run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5' },
    timestamp: 1764052119302,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052119303_86y2',
    role: 'assistant',
    type: 'text',
    content: '险投',
    detail: { streaming: true, run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5' },
    timestamp: 1764052119303,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },
  {
    id: '1764052119303_6yrw',
    role: 'assistant',
    type: 'text',
    content: '保表单。',
    detail: { streaming: true, run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5' },
    timestamp: 1764052119303,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052120586_wisw',
    role: 'assistant',
    type: 'text',
    content: '',
    detail: {
      run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5',
      full_content: '我来为您创建一个保险投保表单。',
      tool_calls: [
        {
          name: 'widget_insurance_form',
          args: {
            productOptions: [
              { label: '重大疾病保险', value: 'critical_illness', description: '保障重大疾病风险' },
              { label: '医疗保险', value: 'medical', description: '保障医疗费用' },
              { label: '意外伤害保险', value: 'accident', description: '保障意外伤害风险' },
              { label: '寿险', value: 'life', description: '保障生命风险' },
            ],
            payYearOptions: [
              { label: '5年', value: '5' },
              { label: '10年', value: '10' },
              { label: '15年', value: '15' },
              { label: '20年', value: '20' },
              { label: '30年', value: '30' },
            ],
            genderOptions: [
              { label: '男', value: 'male' },
              { label: '女', value: 'female' },
            ],
          },
          id: 'toolu_bdrk_016HzYJW3g415Y1X3wDr4jC7',
          type: 'tool_call',
        },
      ],
      usage: { input_tokens: 0, output_tokens: 348, total_tokens: 348, input_token_details: {} },
    },
    timestamp: 1764052120586,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: null,
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052120686_yidf',
    role: 'assistant',
    type: 'widget',
    content: '',
    detail: {
      type: 'done',
      item_id: '1764052120629_ckp3',
      widget: {
        type: 'Card',
        asForm: true,
        children: [
          {
            children: [
              { type: 'Title', value: '投保表单', size: 'md' },
              { type: 'Caption', value: '投保方案' },
              {
                children: [
                  {
                    children: [
                      { type: 'Label', value: '产品', fieldName: 'plan.product' },
                      {
                        type: 'Select',
                        name: 'plan.product',
                        options: [
                          { value: 'critical_illness', label: '重大疾病保险', description: '保障重大疾病风险' },
                          { value: 'medical', label: '医疗保险', description: '保障医疗费用' },
                          { value: 'accident', label: '意外伤害保险', description: '保障意外伤害风险' },
                          { value: 'life', label: '寿险', description: '保障生命风险' },
                        ],
                        placeholder: '选择产品',
                      },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '保额（元）', fieldName: 'plan.sumAssured' },
                      {
                        type: 'Input',
                        name: 'plan.sumAssured',
                        inputType: 'number',
                        required: true,
                        placeholder: '例如 300000',
                      },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '交费年限', fieldName: 'plan.premiumYears' },
                      {
                        type: 'Select',
                        name: 'plan.premiumYears',
                        options: [
                          { value: '5', label: '5年' },
                          { value: '10', label: '10年' },
                          { value: '15', label: '15年' },
                          { value: '20', label: '20年' },
                          { value: '30', label: '30年' },
                        ],
                        placeholder: '选择年限',
                      },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '年交保费', fieldName: 'plan.cost' },
                      {
                        type: 'Input',
                        name: 'plan.cost',
                        inputType: 'number',
                        required: true,
                        placeholder: '例如 300000',
                      },
                    ],
                    type: 'Col',
                  },
                ],
                gap: 2,
                type: 'Col',
              },
              { type: 'Divider' },
              { type: 'Caption', value: '投保人信息' },
              {
                children: [
                  {
                    children: [
                      { type: 'Label', value: '姓名', fieldName: 'policyholder.name' },
                      { type: 'Input', name: 'policyholder.name', required: true, placeholder: '张三' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '手机号', fieldName: 'policyholder.phone' },
                      {
                        type: 'Input',
                        name: 'policyholder.phone',
                        inputType: 'tel',
                        required: true,
                        placeholder: '11位手机号',
                      },
                    ],
                    type: 'Col',
                  },
                ],
                gap: 2,
                type: 'Col',
              },
              { type: 'Divider' },
              { type: 'Caption', value: '被保险人信息' },
              {
                children: [
                  {
                    children: [
                      { type: 'Label', value: '姓名', fieldName: 'insured.name' },
                      { type: 'Input', name: 'insured.name', required: true, placeholder: '李四' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '身份证号', fieldName: 'insured.id' },
                      { type: 'Input', name: 'insured.id', required: true, placeholder: '18位身份证号' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '手机号', fieldName: 'insured.phone' },
                      {
                        type: 'Input',
                        name: 'insured.phone',
                        inputType: 'tel',
                        required: true,
                        placeholder: '11位手机号',
                      },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '年龄', fieldName: 'insured.age' },
                      { type: 'Input', name: 'insured.age', inputType: 'number', required: true, placeholder: '周岁' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '性别', fieldName: 'insured.gender' },
                      {
                        type: 'Select',
                        name: 'insured.gender',
                        options: [
                          { value: 'male', label: '男' },
                          { value: 'female', label: '女' },
                        ],
                        placeholder: '选择性别',
                      },
                    ],
                    type: 'Col',
                  },
                ],
                gap: 2,
                type: 'Col',
              },
              { type: 'Divider' },
              { type: 'Caption', value: '身故受益人' },
              {
                children: [
                  {
                    children: [
                      { type: 'Label', value: '姓名', fieldName: 'benefit.death.name' },
                      { type: 'Input', name: 'benefit.death.name', required: true, placeholder: '受益人姓名' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '与投保人关系', fieldName: 'benefit.death.relation' },
                      {
                        type: 'Input',
                        name: 'benefit.death.relation',
                        required: true,
                        placeholder: '如 配偶/子女/父母',
                      },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '手机号', fieldName: 'benefit.death.phone' },
                      { type: 'Input', name: 'benefit.death.phone', inputType: 'tel', placeholder: '手机号' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '受益比例%', fieldName: 'benefit.death.share' },
                      {
                        type: 'Input',
                        name: 'benefit.death.share',
                        inputType: 'number',
                        defaultValue: '100',
                        placeholder: '例如 100',
                      },
                    ],
                    type: 'Col',
                  },
                ],
                gap: 2,
                type: 'Col',
              },
              { type: 'Divider' },
              { type: 'Caption', value: '身残受益人' },
              {
                children: [
                  {
                    children: [
                      { type: 'Label', value: '姓名', fieldName: 'benefit.disability.name' },
                      { type: 'Input', name: 'benefit.disability.name', placeholder: '受益人姓名' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '与投保人关系', fieldName: 'benefit.disability.relation' },
                      { type: 'Input', name: 'benefit.disability.relation', placeholder: '如 配偶/子女/父母' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '手机号', fieldName: 'benefit.disability.phone' },
                      { type: 'Input', name: 'benefit.disability.phone', inputType: 'tel', placeholder: '手机号' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: '受益比例%', fieldName: 'benefit.disability.share' },
                      { type: 'Input', name: 'benefit.disability.share', inputType: 'number', placeholder: '例如 100' },
                    ],
                    type: 'Col',
                  },
                ],
                gap: 2,
                type: 'Col',
              },
            ],
            gap: 3,
            type: 'Col',
          },
        ],
        size: 'md',
        confirm: { label: '提交投保', action: { type: 'insurance.apply', handler: 'server', loadingBehavior: 'auto' } },
        cancel: { label: '取消', action: { type: 'insurance.cancel', handler: 'server', loadingBehavior: 'auto' } },
      },
      copy_text: null,
    },
    timestamp: 1764052120686,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: null,
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052124387_rh3q',
    role: 'assistant',
    type: 'finish_reason',
    content: 'Task completed',
    detail: { reason: 'Task completed', status: 'completed' },
    timestamp: 1764052124387,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: null,
    field_name: null,
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052138950_9c05c222',
    role: 'user',
    type: 'text',
    content: '提交投保',
    detail: {},
    timestamp: 1764052138973,
  },

  {
    id: '1764052143882_3hus',
    role: 'assistant',
    type: 'text',
    content: '我注',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143882,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052143883_u7c2',
    role: 'assistant',
    type: 'text',
    content: '意到您提',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143883,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052143884_kyh1',
    role: 'assistant',
    type: 'text',
    content: '交',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143884,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052143885_dd1e',
    role: 'assistant',
    type: 'text',
    content: '的表',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143885,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052143885_p9cv',
    role: 'assistant',
    type: 'text',
    content: '单中',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143885,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052143886_5coh',
    role: 'assistant',
    type: 'text',
    content: '有多',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143886,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052143886_52i1',
    role: 'assistant',
    type: 'text',
    content: '个必',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143886,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052143887_dmtw',
    role: 'assistant',
    type: 'text',
    content: '填项',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143887,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052143887_1kr1',
    role: 'assistant',
    type: 'text',
    content: '未',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143887,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052143887_ry68',
    role: 'assistant',
    type: 'text',
    content: '填写。请',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143887,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052143888_xeel',
    role: 'assistant',
    type: 'text',
    content: '您完',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143888,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052143888_61fr',
    role: 'assistant',
    type: 'text',
    content: '善',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143888,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144698_kcz3',
    role: 'assistant',
    type: 'text',
    content: '以',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144698,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144699_gidb',
    role: 'assistant',
    type: 'text',
    content: '下信息后',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144699,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144699_buzh',
    role: 'assistant',
    type: 'text',
    content: '再提交：\n\n**',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144699,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144700_stxz',
    role: 'assistant',
    type: 'text',
    content: '投',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144700,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144701_heus',
    role: 'assistant',
    type: 'text',
    content: '保方',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144701,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144701_suds',
    role: 'assistant',
    type: 'text',
    content: '案：**\n- 产',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144701,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144702_oesq',
    role: 'assistant',
    type: 'text',
    content: '品名',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144702,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144703_3mbn',
    role: 'assistant',
    type: 'text',
    content: '称',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144703,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144703_vh2n',
    role: 'assistant',
    type: 'text',
    content: '\n- 保额\n- 交',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144703,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144704_0unn',
    role: 'assistant',
    type: 'text',
    content: '费年限\n- 年',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144704,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144704_94yz',
    role: 'assistant',
    type: 'text',
    content: '交',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144704,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144704_y829',
    role: 'assistant',
    type: 'text',
    content: '保',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144704,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144705_731s',
    role: 'assistant',
    type: 'text',
    content: '费',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144705,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144705_abp2',
    role: 'assistant',
    type: 'text',
    content: '\n\n**投',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144705,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144705_kb9g',
    role: 'assistant',
    type: 'text',
    content: '保人信息：**\n-',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144705,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052144705_x06t',
    role: 'assistant',
    type: 'text',
    content: ' 姓名\n- 手',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144705,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145507_s942',
    role: 'assistant',
    type: 'text',
    content: '机号',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145507,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145508_owhs',
    role: 'assistant',
    type: 'text',
    content: '\n\n**被保险',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145508,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145508_esaf',
    role: 'assistant',
    type: 'text',
    content: '人信息：**\n- ',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145508,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145509_wtkl',
    role: 'assistant',
    type: 'text',
    content: '姓名\n- 身',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145509,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145510_lluo',
    role: 'assistant',
    type: 'text',
    content: '份证号\n- 手机',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145510,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145510_evyu',
    role: 'assistant',
    type: 'text',
    content: '号\n- 年龄',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145510,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145511_ds77',
    role: 'assistant',
    type: 'text',
    content: '\n- 性别\n\n**身',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145511,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145512_ug4a',
    role: 'assistant',
    type: 'text',
    content: '故受',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145512,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145513_1r0j',
    role: 'assistant',
    type: 'text',
    content: '益人：',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145513,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145513_ds57',
    role: 'assistant',
    type: 'text',
    content: '**\n- 姓名',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145513,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145513_jhu9',
    role: 'assistant',
    type: 'text',
    content: '\n- 与',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145513,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145514_9qba',
    role: 'assistant',
    type: 'text',
    content: '投',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145514,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145514_xikw',
    role: 'assistant',
    type: 'text',
    content: '保人关系\n- 手',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145514,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145514_xi2r',
    role: 'assistant',
    type: 'text',
    content: '机号',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145514,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145515_d5ve',
    role: 'assistant',
    type: 'text',
    content: '\n\n**身',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145515,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052145515_wxzk',
    role: 'assistant',
    type: 'text',
    content: '残',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145515,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146351_7glk',
    role: 'assistant',
    type: 'text',
    content: '受',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146351,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146352_8075',
    role: 'assistant',
    type: 'text',
    content: '益人：**\n- ',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146352,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146353_t28l',
    role: 'assistant',
    type: 'text',
    content: '姓名\n- 与投保',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146353,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146353_6ev6',
    role: 'assistant',
    type: 'text',
    content: '人关系\n- 手机',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146353,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146354_6inr',
    role: 'assistant',
    type: 'text',
    content: '号',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146354,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146355_fnmz',
    role: 'assistant',
    type: 'text',
    content: '\n- 受',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146355,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146355_cdto',
    role: 'assistant',
    type: 'text',
    content: '益比',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146355,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146356_ypht',
    role: 'assistant',
    type: 'text',
    content: '例\n\n请',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146356,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146357_0kdh',
    role: 'assistant',
    type: 'text',
    content: '您返',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146357,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146357_onfx',
    role: 'assistant',
    type: 'text',
    content: '回表',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146357,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146357_2tzj',
    role: 'assistant',
    type: 'text',
    content: '单填',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146357,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146358_dnxc',
    role: 'assistant',
    type: 'text',
    content: '写完整信',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146358,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146358_r8ta',
    role: 'assistant',
    type: 'text',
    content: '息，我将',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146358,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146358_8lu8',
    role: 'assistant',
    type: 'text',
    content: '帮您处',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146358,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146359_twuu',
    role: 'assistant',
    type: 'text',
    content: '理投保申请。',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146359,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146364_4c2x',
    role: 'assistant',
    type: 'text',
    content: '',
    detail: {
      run_id: '6b264749-7747-4743-ab4a-84694530b406',
      full_content:
        '我注意到您提交的表单中有多个必填项未填写。请您完善以下信息后再提交：\n\n**投保方案：**\n- 产品名称\n- 保额\n- 交费年限\n- 年交保费\n\n**投保人信息：**\n- 姓名\n- 手机号\n\n**被保险人信息：**\n- 姓名\n- 身份证号\n- 手机号\n- 年龄\n- 性别\n\n**身故受益人：**\n- 姓名\n- 与投保人关系\n- 手机号\n\n**身残受益人：**\n- 姓名\n- 与投保人关系\n- 手机号\n- 受益比例\n\n请您返回表单填写完整信息，我将帮您处理投保申请。',
      usage: { input_tokens: 0, output_tokens: 226, total_tokens: 226, input_token_details: {} },
    },
    timestamp: 1764052146364,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: null,
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052146393_pio7',
    role: 'assistant',
    type: 'finish_reason',
    content: 'Task completed',
    detail: { reason: 'Task completed', status: 'completed' },
    timestamp: 1764052146393,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: null,
    field_name: null,
    trace_base_url: 'https://trace.example.test',
  },

  { id: '1764052150602_5e4c7556', role: 'user', type: 'text', content: '取消', detail: {}, timestamp: 1764052150624 },

  {
    id: '1764052155324_x4sd',
    role: 'assistant',
    type: 'text',
    content: '好',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155324,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155325_3ej3',
    role: 'assistant',
    type: 'text',
    content: '的，已',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155325,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155326_5fbu',
    role: 'assistant',
    type: 'text',
    content: '取消投保申',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155326,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155326_or4q',
    role: 'assistant',
    type: 'text',
    content: '请。如',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155326,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155327_x0yc',
    role: 'assistant',
    type: 'text',
    content: '果您',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155327,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155328_zwvb',
    role: 'assistant',
    type: 'text',
    content: '之',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155328,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155328_nr5u',
    role: 'assistant',
    type: 'text',
    content: '后',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155328,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155328_zodu',
    role: 'assistant',
    type: 'text',
    content: '需要投',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155328,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155329_532s',
    role: 'assistant',
    type: 'text',
    content: '保或',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155329,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155329_yun0',
    role: 'assistant',
    type: 'text',
    content: '有',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155329,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155329_pvt3',
    role: 'assistant',
    type: 'text',
    content: '任',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155329,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155330_dlnl',
    role: 'assistant',
    type: 'text',
    content: '何保',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155330,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155531_7oo1',
    role: 'assistant',
    type: 'text',
    content: '险相关的',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155531,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155532_uwg0',
    role: 'assistant',
    type: 'text',
    content: '问题，随',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155532,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155533_35iy',
    role: 'assistant',
    type: 'text',
    content: '时可以告',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155533,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155534_3ici',
    role: 'assistant',
    type: 'text',
    content: '诉我！',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155534,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155534_ylw0',
    role: 'assistant',
    type: 'text',
    content: '',
    detail: {
      run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43',
      full_content: '好的，已取消投保申请。如果您之后需要投保或有任何保险相关的问题，随时可以告诉我！',
      usage: { input_tokens: 0, output_tokens: 45, total_tokens: 45, input_token_details: {} },
    },
    timestamp: 1764052155534,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: null,
    trace_base_url: 'https://trace.example.test',
  },

  {
    id: '1764052155561_0rp5',
    role: 'assistant',
    type: 'finish_reason',
    content: 'Task completed',
    detail: { reason: 'Task completed', status: 'completed' },
    timestamp: 1764052155561,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: null,
    field_name: null,
    trace_base_url: 'https://trace.example.test',
  },
];

describe('transformChunksToMessages', () => {
  it('1', () => {
    const stepByStepMessages = transformChunksToMessages(chunks.slice(0, 1) as MessageChunk[], []);
    const onceMessages = transformChunksToMessages(chunks.slice(0, 1) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });

  it('2', () => {
    const stepByStepMessages = transformChunksToMessages(
      chunks.slice(1, 2) as MessageChunk[],
      transformChunksToMessages(chunks.slice(0, 1) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(chunks.slice(0, 2) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });

  it('3', () => {
    const stepByStepMessages = transformChunksToMessages(
      chunks.slice(2, 3) as MessageChunk[],
      transformChunksToMessages(chunks.slice(0, 2) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(chunks.slice(0, 3) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });

  it('8', () => {
    const stepByStepMessages = transformChunksToMessages(
      chunks.slice(8, 9) as MessageChunk[],
      transformChunksToMessages(chunks.slice(0, 8) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(chunks.slice(0, 9) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('9', () => {
    const stepByStepMessages = transformChunksToMessages(
      chunks.slice(9, 10) as MessageChunk[],
      transformChunksToMessages(chunks.slice(0, 9) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(chunks.slice(0, 10) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });

  it('12', () => {
    const stepByStepMessages = transformChunksToMessages(
      chunks.slice(11, 12) as MessageChunk[],
      transformChunksToMessages(chunks.slice(0, 11) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(chunks.slice(0, 12) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });

  it('user message 2 - 1', () => {
    const index = findIndex(chunks, (chunk) => chunk.role === 'user', 2);
    const stepByStepMessages = transformChunksToMessages(
      chunks.slice(index - 1, index) as MessageChunk[],
      transformChunksToMessages(chunks.slice(0, index - 1) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(chunks.slice(0, index) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });

  it('user message 2 - 2', () => {
    const index = findIndex(chunks, (chunk) => chunk.role === 'user', 2);
    console.log('index', index);
    const stepByStepMessages = transformChunksToMessages(
      chunks.slice(index, index + 1) as MessageChunk[],
      transformChunksToMessages(chunks.slice(0, index) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(chunks.slice(0, index + 1) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });

  it('user message 3', () => {
    const index = chunks.findLastIndex((chunk) => chunk.role === 'user');
    const stepByStepMessages = transformChunksToMessages(
      chunks.slice(index - 1, index) as MessageChunk[],
      transformChunksToMessages(chunks.slice(0, index - 1) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(chunks.slice(0, index) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
});
