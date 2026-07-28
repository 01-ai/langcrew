import PhoneSvg from '@/assets/svg/staff/phone-icon.svg';
import SuitCaseSvg from '@/assets/svg/staff/suitcase-icon.svg';
import Locked from '@/assets//svg/staff/locked.svg';

export interface EmployeeType {
  id: number;
  super_employee_id: string;
  name: string;
  avatar: string;
  desc: string;
  desc_items: string[];
  status: 'ACTIVE' | 'COMING';
  created_at: string;
  updated_at: string;
  agent_tools: { tool_name: string; tool_avatar: string }[];
}

export const listData: EmployeeType[] = [
  {
    id: 1,
    super_employee_id: '1',
    name: 'Travel agent',
    avatar: Locked,
    status: 'ACTIVE',
    desc: 'Helps staff and businesses to quickly complete standardized travel requests and list processes',
    desc_items: ['Smart planning of the trip', 'Cost budget management', 'Travel policy compliance'],
    updated_at: '',
    created_at: '',
    agent_tools: [
      {
        tool_avatar: PhoneSvg,
        tool_name: 'Cloud cell phone.',
      },
      {
        tool_avatar: SuitCaseSvg,
        tool_name: 'Code Compiler',
      },
    ],
  },
  {
    id: 2,
    super_employee_id: '2',
    name: 'Logistics optimizer',
    avatar: Locked,
    status: 'ACTIVE',
    desc: 'Call internal and external data sources and use scientific software for circuit optimization',
    desc_items: ['Enterprise in-house database', 'External data sources', 'Sandbox Smart Body (AIProgramming)'],
    updated_at: '',
    created_at: '',
    agent_tools: [
      {
        tool_avatar: PhoneSvg,
        tool_name: 'Cloud cell phone.',
      },
      {
        tool_avatar: SuitCaseSvg,
        tool_name: 'Code Compiler',
      },
    ],
  },
  {
    id: 3,
    super_employee_id: '3',
    name: 'Patent Engineer',
    avatar: Locked,
    status: 'ACTIVE',
    desc: 'Helps staff and businesses to quickly complete standardized travel requests and list processes',
    desc_items: ['Patent Retrieval', 'Patent Office database', 'AIWriting (including process)/(Framework)'],
    updated_at: '',
    created_at: '',
    agent_tools: [
      {
        tool_avatar: PhoneSvg,
        tool_name: 'Cloud cell phone.',
      },
      {
        tool_avatar: SuitCaseSvg,
        tool_name: 'Code Compiler',
      },
    ],
  },
  {
    id: 4,
    super_employee_id: '4',
    name: 'Recruitment Commissioner',
    avatar: Locked,
    status: 'ACTIVE',
    desc: 'Call internal and external data sources and use scientific software for circuit optimization',
    desc_items: ['Enterprise in-house database', 'External data sources', 'Sandbox Smart Body (AIProgramming)'],
    updated_at: '',
    created_at: '',
    agent_tools: [
      {
        tool_avatar: PhoneSvg,
        tool_name: 'Cloud cell phone.',
      },
      {
        tool_avatar: SuitCaseSvg,
        tool_name: 'Code Compiler',
      },
    ],
  },
  {
    id: 5,
    super_employee_id: '5',
    name: 'Assistant to the Chief of the Shop',
    avatar: Locked,
    status: 'ACTIVE',
    desc: 'Call internal and external data sources and use scientific software for circuit optimization',
    desc_items: ['Enterprise in-house database', 'External data sources', 'Sandbox Smart Body (AIProgramming)'],
    updated_at: '',
    created_at: '',
    agent_tools: [
      {
        tool_avatar: PhoneSvg,
        tool_name: 'Cloud cell phone.',
      },
      {
        tool_avatar: SuitCaseSvg,
        tool_name: 'Code Compiler',
      },
    ],
  },
  {
    id: 6,
    super_employee_id: '6',
    name: 'Insurance agent',
    avatar: Locked,
    status: 'COMING',
    desc: 'Call internal and external data sources and use scientific software for circuit optimization',
    desc_items: ['Enterprise in-house database', 'External data sources', 'Sandbox Smart Body (AIProgramming)'],
    updated_at: '',
    created_at: '',
    agent_tools: [
      {
        tool_avatar: PhoneSvg,
        tool_name: 'Cloud cell phone.',
      },
      {
        tool_avatar: SuitCaseSvg,
        tool_name: 'Code Compiler',
      },
    ],
  },
];
