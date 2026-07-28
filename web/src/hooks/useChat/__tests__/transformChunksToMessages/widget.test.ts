import { describe, it, expect } from 'vitest';
import { MessageChunk } from '@/types';
import { findIndex } from 'lodash-es';
import { transformChunksToMessages } from '../../transformChunksToMessages';

const chunks = [
  {
    id: '1764052113555_7f510b94',
    role: 'user',
    type: 'text',
    content: 'I need insurance.',
    detail: {},
    timestamp: 1764052113555,
    trace_id: null,
    trace_base_url: 'https://trace.example.invalid',
    step_id: null,
    is_llm_message: false,
    session_id: '1d0b58c2c65249eb',
  },
  {
    id: '1764052119298_qftt',
    role: 'assistant',
    type: 'text',
    content: 'I got it.',
    detail: { streaming: true, run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5' },
    timestamp: 1764052119298,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052119300_otsz',
    role: 'assistant',
    type: 'text',
    content: 'Yes',
    detail: { streaming: true, run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5' },
    timestamp: 1764052119300,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052119301_pu3q',
    role: 'assistant',
    type: 'text',
    content: 'You\'re the one who made it.',
    detail: { streaming: true, run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5' },
    timestamp: 1764052119301,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052119302_4g8s',
    role: 'assistant',
    type: 'text',
    content: 'Build a security.',
    detail: { streaming: true, run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5' },
    timestamp: 1764052119302,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052119303_86y2',
    role: 'assistant',
    type: 'text',
    content: '- It\'s a risk.',
    detail: { streaming: true, run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5' },
    timestamp: 1764052119303,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },
  {
    id: '1764052119303_6yrw',
    role: 'assistant',
    type: 'text',
    content: 'Insurance policy.',
    detail: { streaming: true, run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5' },
    timestamp: 1764052119303,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052120586_wisw',
    role: 'assistant',
    type: 'text',
    content: '',
    detail: {
      run_id: '6b89d479-4484-4c5d-ad3f-b09627f5a8b5',
      full_content: 'I\'m here to create an insurance policy for you.',
      tool_calls: [
        {
          name: 'widget_insurance_form',
          args: {
            productOptions: [
              { label: 'Major sickness insurance', value: 'critical_illness', description: 'Protecting the risk of major diseases' },
              { label: 'Medical insurance', value: 'medical', description: 'Guaranteed medical expenses' },
              { label: 'Accident insurance', value: 'accident', description: 'Safeguarding the risk of accidental injury' },
              { label: 'Life insurance', value: 'life', description: 'Risks to life' },
            ],
            payYearOptions: [
              { label: '5Year', value: '5' },
              { label: '10Year', value: '10' },
              { label: '15Year', value: '15' },
              { label: '20Year', value: '20' },
              { label: '30Year', value: '30' },
            ],
            genderOptions: [
              { label: 'Men', value: 'male' },
              { label: 'Women', value: 'female' },
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
    trace_base_url: 'https://trace.example.invalid',
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
              { type: 'Title', value: 'Insurance forms', size: 'md' },
              { type: 'Caption', value: 'Insurance scheme' },
              {
                children: [
                  {
                    children: [
                      { type: 'Label', value: 'Products', fieldName: 'plan.product' },
                      {
                        type: 'Select',
                        name: 'plan.product',
                        options: [
                          { value: 'critical_illness', label: 'Major sickness insurance', description: 'Protecting the risk of major diseases' },
                          { value: 'medical', label: 'Medical insurance', description: 'Guaranteed medical expenses' },
                          { value: 'accident', label: 'Accident insurance', description: 'Safeguarding the risk of accidental injury' },
                          { value: 'life', label: 'Life insurance', description: 'Risks to life' },
                        ],
                        placeholder: 'Select the product',
                      },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'Guarantee ($)', fieldName: 'plan.sumAssured' },
                      {
                        type: 'Input',
                        name: 'plan.sumAssured',
                        inputType: 'number',
                        required: true,
                        placeholder: 'For example: 300000',
                      },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'Years of contributions', fieldName: 'plan.premiumYears' },
                      {
                        type: 'Select',
                        name: 'plan.premiumYears',
                        options: [
                          { value: '5', label: '5Year' },
                          { value: '10', label: '10Year' },
                          { value: '15', label: '15Year' },
                          { value: '20', label: '20Year' },
                          { value: '30', label: '30Year' },
                        ],
                        placeholder: 'Select Years',
                      },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'Annual contributions', fieldName: 'plan.cost' },
                      {
                        type: 'Input',
                        name: 'plan.cost',
                        inputType: 'number',
                        required: true,
                        placeholder: 'For example: 300000',
                      },
                    ],
                    type: 'Col',
                  },
                ],
                gap: 2,
                type: 'Col',
              },
              { type: 'Divider' },
              { type: 'Caption', value: 'Information on the insured person' },
              {
                children: [
                  {
                    children: [
                      { type: 'Label', value: 'Name', fieldName: 'policyholder.name' },
                      { type: 'Input', name: 'policyholder.name', required: true, placeholder: 'Zhang San' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'Cell phone number', fieldName: 'policyholder.phone' },
                      {
                        type: 'Input',
                        name: 'policyholder.phone',
                        inputType: 'tel',
                        required: true,
                        placeholder: '11Cell phone number',
                      },
                    ],
                    type: 'Col',
                  },
                ],
                gap: 2,
                type: 'Col',
              },
              { type: 'Divider' },
              { type: 'Caption', value: 'Information on the insured person' },
              {
                children: [
                  {
                    children: [
                      { type: 'Label', value: 'Name', fieldName: 'insured.name' },
                      { type: 'Input', name: 'insured.name', required: true, placeholder: 'Li Siu' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'ID number', fieldName: 'insured.id' },
                      { type: 'Input', name: 'insured.id', required: true, placeholder: '18ID number' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'Cell phone number', fieldName: 'insured.phone' },
                      {
                        type: 'Input',
                        name: 'insured.phone',
                        inputType: 'tel',
                        required: true,
                        placeholder: '11Cell phone number',
                      },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'Age', fieldName: 'insured.age' },
                      { type: 'Input', name: 'insured.age', inputType: 'number', required: true, placeholder: 'Age' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'Gender', fieldName: 'insured.gender' },
                      {
                        type: 'Select',
                        name: 'insured.gender',
                        options: [
                          { value: 'male', label: 'Men' },
                          { value: 'female', label: 'Women' },
                        ],
                        placeholder: 'Sex selection',
                      },
                    ],
                    type: 'Col',
                  },
                ],
                gap: 2,
                type: 'Col',
              },
              { type: 'Divider' },
              { type: 'Caption', value: 'Beneficiaries' },
              {
                children: [
                  {
                    children: [
                      { type: 'Label', value: 'Name', fieldName: 'benefit.death.name' },
                      { type: 'Input', name: 'benefit.death.name', required: true, placeholder: 'Name of beneficiary' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'Relations with policy-holders', fieldName: 'benefit.death.relation' },
                      {
                        type: 'Input',
                        name: 'benefit.death.relation',
                        required: true,
                        placeholder: 'For example, a spouse/Children/Parents',
                      },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'Cell phone number', fieldName: 'benefit.death.phone' },
                      { type: 'Input', name: 'benefit.death.phone', inputType: 'tel', placeholder: 'Cell phone number' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'Proportion of beneficiaries%', fieldName: 'benefit.death.share' },
                      {
                        type: 'Input',
                        name: 'benefit.death.share',
                        inputType: 'number',
                        defaultValue: '100',
                        placeholder: 'For example: 100',
                      },
                    ],
                    type: 'Col',
                  },
                ],
                gap: 2,
                type: 'Col',
              },
              { type: 'Divider' },
              { type: 'Caption', value: 'Disabled beneficiaries' },
              {
                children: [
                  {
                    children: [
                      { type: 'Label', value: 'Name', fieldName: 'benefit.disability.name' },
                      { type: 'Input', name: 'benefit.disability.name', placeholder: 'Name of beneficiary' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'Relations with policy-holders', fieldName: 'benefit.disability.relation' },
                      { type: 'Input', name: 'benefit.disability.relation', placeholder: 'For example, a spouse/Children/Parents' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'Cell phone number', fieldName: 'benefit.disability.phone' },
                      { type: 'Input', name: 'benefit.disability.phone', inputType: 'tel', placeholder: 'Cell phone number' },
                    ],
                    type: 'Col',
                  },
                  {
                    children: [
                      { type: 'Label', value: 'Proportion of beneficiaries%', fieldName: 'benefit.disability.share' },
                      { type: 'Input', name: 'benefit.disability.share', inputType: 'number', placeholder: 'For example: 100' },
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
        confirm: { label: 'Submission of insurance', action: { type: 'insurance.apply', handler: 'server', loadingBehavior: 'auto' } },
        cancel: { label: 'Cancel', action: { type: 'insurance.cancel', handler: 'server', loadingBehavior: 'auto' } },
      },
      copy_text: null,
    },
    timestamp: 1764052120686,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_113941',
    trace_id: 'de9ecf8da6ea17c86ec0baba87fb10bf',
    field_name: null,
    trace_base_url: 'https://trace.example.invalid',
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
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052138950_9c05c222',
    role: 'user',
    type: 'text',
    content: 'Submission of insurance',
    detail: {},
    timestamp: 1764052138973,
  },

  {
    id: '1764052143882_3hus',
    role: 'assistant',
    type: 'text',
    content: 'I\'ll bet.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143882,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052143883_u7c2',
    role: 'assistant',
    type: 'text',
    content: 'I\'m impressed.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143883,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052143884_kyh1',
    role: 'assistant',
    type: 'text',
    content: 'Hand it over.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143884,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052143885_dd1e',
    role: 'assistant',
    type: 'text',
    content: 'Table',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143885,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052143885_p9cv',
    role: 'assistant',
    type: 'text',
    content: 'Single',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143885,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052143886_5coh',
    role: 'assistant',
    type: 'text',
    content: 'How many?',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143886,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052143886_52i1',
    role: 'assistant',
    type: 'text',
    content: 'Psychic.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143886,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052143887_dmtw',
    role: 'assistant',
    type: 'text',
    content: 'Fill',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143887,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052143887_1kr1',
    role: 'assistant',
    type: 'text',
    content: 'Not',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143887,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052143887_ry68',
    role: 'assistant',
    type: 'text',
    content: 'Fill out. Please.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143887,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052143888_xeel',
    role: 'assistant',
    type: 'text',
    content: 'You\'re done.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143888,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052143888_61fr',
    role: 'assistant',
    type: 'text',
    content: 'Yes.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052143888,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144698_kcz3',
    role: 'assistant',
    type: 'text',
    content: 'Here.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144698,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144699_gidb',
    role: 'assistant',
    type: 'text',
    content: 'After the message',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144699,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144699_buzh',
    role: 'assistant',
    type: 'text',
    content: 'Resubmission:\n\n**',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144699,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144700_stxz',
    role: 'assistant',
    type: 'text',
    content: 'Throw!',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144700,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144701_heus',
    role: 'assistant',
    type: 'text',
    content: 'The bodyguard.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144701,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144701_suds',
    role: 'assistant',
    type: 'text',
    content: 'Case:**\n- Production',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144701,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144702_oesq',
    role: 'assistant',
    type: 'text',
    content: 'Practising Name',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144702,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144703_3mbn',
    role: 'assistant',
    type: 'text',
    content: 'Claims',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144703,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144703_vh2n',
    role: 'assistant',
    type: 'text',
    content: '\n- Guarantee\n- Hand it over.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144703,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144704_0unn',
    role: 'assistant',
    type: 'text',
    content: 'Years of fees\n- Year',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144704,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144704_94yz',
    role: 'assistant',
    type: 'text',
    content: 'Hand it over.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144704,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144704_y829',
    role: 'assistant',
    type: 'text',
    content: 'Por',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144704,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144705_731s',
    role: 'assistant',
    type: 'text',
    content: 'Fees',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144705,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144705_abp2',
    role: 'assistant',
    type: 'text',
    content: '\n\n**Throw!',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144705,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144705_kb9g',
    role: 'assistant',
    type: 'text',
    content: 'Security information:**\n-',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144705,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052144705_x06t',
    role: 'assistant',
    type: 'text',
    content: ' Name\n- Hands.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052144705,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145507_s942',
    role: 'assistant',
    type: 'text',
    content: 'Number',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145507,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145508_owhs',
    role: 'assistant',
    type: 'text',
    content: '\n\n**Insured',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145508,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145508_esaf',
    role: 'assistant',
    type: 'text',
    content: 'Person information:**\n- ',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145508,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145509_wtkl',
    role: 'assistant',
    type: 'text',
    content: 'Name\n- Body',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145509,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145510_lluo',
    role: 'assistant',
    type: 'text',
    content: 'Certificate number\n- Cell phone.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145510,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145510_evyu',
    role: 'assistant',
    type: 'text',
    content: 'No, no, no.\n- Age',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145510,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145511_ds77',
    role: 'assistant',
    type: 'text',
    content: '\n- Gender\n\n**Body',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145511,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145512_ug4a',
    role: 'assistant',
    type: 'text',
    content: 'I\'m sorry.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145512,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145513_1r0j',
    role: 'assistant',
    type: 'text',
    content: 'Beneath me:',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145513,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145513_ds57',
    role: 'assistant',
    type: 'text',
    content: '**\n- Name',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145513,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145513_jhu9',
    role: 'assistant',
    type: 'text',
    content: '\n- and',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145513,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145514_9qba',
    role: 'assistant',
    type: 'text',
    content: 'Throw!',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145514,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145514_xikw',
    role: 'assistant',
    type: 'text',
    content: 'Security relations\n- Hands.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145514,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145514_xi2r',
    role: 'assistant',
    type: 'text',
    content: 'Number',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145514,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145515_d5ve',
    role: 'assistant',
    type: 'text',
    content: '\n\n**Body',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145515,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052145515_wxzk',
    role: 'assistant',
    type: 'text',
    content: 'Disability',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052145515,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146351_7glk',
    role: 'assistant',
    type: 'text',
    content: 'Yes.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146351,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146352_8075',
    role: 'assistant',
    type: 'text',
    content: 'Beneath me:**\n- ',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146352,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146353_t28l',
    role: 'assistant',
    type: 'text',
    content: 'Name\n- Insurance',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146353,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146353_6ev6',
    role: 'assistant',
    type: 'text',
    content: 'Human relations\n- Cell phone.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146353,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146354_6inr',
    role: 'assistant',
    type: 'text',
    content: 'No, no, no.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146354,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146355_fnmz',
    role: 'assistant',
    type: 'text',
    content: '\n- Yes.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146355,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146355_cdto',
    role: 'assistant',
    type: 'text',
    content: 'Gaines',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146355,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146356_ypht',
    role: 'assistant',
    type: 'text',
    content: 'Example\n\nPlease.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146356,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146357_0kdh',
    role: 'assistant',
    type: 'text',
    content: 'You\'re back.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146357,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146357_onfx',
    role: 'assistant',
    type: 'text',
    content: 'Return Form',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146357,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146357_2tzj',
    role: 'assistant',
    type: 'text',
    content: 'Fill',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146357,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146358_dnxc',
    role: 'assistant',
    type: 'text',
    content: 'Write a full letter.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146358,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146358_r8ta',
    role: 'assistant',
    type: 'text',
    content: 'I\'ll...',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146358,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146358_8lu8',
    role: 'assistant',
    type: 'text',
    content: 'Help you.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146358,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146359_twuu',
    role: 'assistant',
    type: 'text',
    content: '(c) Processing of applications for insurance.',
    detail: { streaming: true, run_id: '6b264749-7747-4743-ab4a-84694530b406' },
    timestamp: 1764052146359,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052146364_4c2x',
    role: 'assistant',
    type: 'text',
    content: '',
    detail: {
      run_id: '6b264749-7747-4743-ab4a-84694530b406',
      full_content:
        'I note that you have submitted several entries that are not filled out. Please complete the following information before submitting:\n\n**Insurance schemes:**\n- Product name\n- Guarantee\n- Years of contributions\n- Annual contributions\n\n**Information on the insured person:**\n- Name\n- Cell phone number\n\n**Information on insured persons:**\n- Name\n- ID number\n- Cell phone number\n- Age\n- Gender\n\n**Beneficiaries of death:**\n- Name\n- Relations with policy-holders\n- Cell phone number\n\n**Beneficiaries with disabilities:**\n- Name\n- Relations with policy-holders\n- Cell phone number\n- Proportion of beneficiaries\n\nPlease return the form and complete the information. I will help you with the application.',
      usage: { input_tokens: 0, output_tokens: 226, total_tokens: 226, input_token_details: {} },
    },
    timestamp: 1764052146364,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_139047',
    trace_id: '586e347f127813ee1733727170d013d4',
    field_name: null,
    trace_base_url: 'https://trace.example.invalid',
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
    trace_base_url: 'https://trace.example.invalid',
  },

  { id: '1764052150602_5e4c7556', role: 'user', type: 'text', content: 'Cancel', detail: {}, timestamp: 1764052150624 },

  {
    id: '1764052155324_x4sd',
    role: 'assistant',
    type: 'text',
    content: 'Okay.',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155324,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155325_3ej3',
    role: 'assistant',
    type: 'text',
    content: 'Yes, it is.',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155325,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155326_5fbu',
    role: 'assistant',
    type: 'text',
    content: 'Cancel the insurance application.',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155326,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155326_or4q',
    role: 'assistant',
    type: 'text',
    content: 'Please.',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155326,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155327_x0yc',
    role: 'assistant',
    type: 'text',
    content: 'You\'re the one who\'s got to be here.',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155327,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155328_zwvb',
    role: 'assistant',
    type: 'text',
    content: ' And the ',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155328,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155328_nr5u',
    role: 'assistant',
    type: 'text',
    content: 'Back',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155328,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155328_zodu',
    role: 'assistant',
    type: 'text',
    content: 'We need to pitch.',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155328,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155329_532s',
    role: 'assistant',
    type: 'text',
    content: 'Guarantee or',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155329,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155329_yun0',
    role: 'assistant',
    type: 'text',
    content: 'Yes.',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155329,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155329_pvt3',
    role: 'assistant',
    type: 'text',
    content: 'Ren.',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155329,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155330_dlnl',
    role: 'assistant',
    type: 'text',
    content: 'Ho Bao!',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155330,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155531_7oo1',
    role: 'assistant',
    type: 'text',
    content: 'Risk-related',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155531,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155532_uwg0',
    role: 'assistant',
    type: 'text',
    content: 'Problem, whatever.',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155532,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155533_35iy',
    role: 'assistant',
    type: 'text',
    content: 'You can sue me now.',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155533,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155534_3ici',
    role: 'assistant',
    type: 'text',
    content: '- Say something!',
    detail: { streaming: true, run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43' },
    timestamp: 1764052155534,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: 'content',
    trace_base_url: 'https://trace.example.invalid',
  },

  {
    id: '1764052155534_ylw0',
    role: 'assistant',
    type: 'text',
    content: '',
    detail: {
      run_id: '8331e6b3-e7e0-46f2-bd64-f02308ed0b43',
      full_content: 'You can tell me if you need insurance or any insurance-related issues later!',
      usage: { input_tokens: 0, output_tokens: 45, total_tokens: 45, input_token_details: {} },
    },
    timestamp: 1764052155534,
    session_id: '1d0b58c2c65249eb',
    task_id: '1d0b58c2c65249eb_150698',
    trace_id: '430cdbf4ef9dd3e39ec4a68fdc30304b',
    field_name: null,
    trace_base_url: 'https://trace.example.invalid',
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
    trace_base_url: 'https://trace.example.invalid',
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
