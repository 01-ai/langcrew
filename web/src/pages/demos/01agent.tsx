import AgentX, { type AgentXHandle, type WelcomeScreenContext } from '@/AgentX';
import type { MessageMetadata, ReferenceCardMetadata } from '@/types';
import type { MessageMetadataRenderContext, SenderSkill } from '@/types/agentx';
import { CloseOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons';
import React, { useRef, useState } from 'react';

const SKILLS: SenderSkill[] = [{ value: '/Business briefing' }, { value: '/Questioning' }, { value: '/PPTGenerate' }];

interface TodoReferenceMetadata extends ReferenceCardMetadata {
  payload: {
    status: 'pending';
    priority: 'high';
    owner: string;
  };
}

type TodoMessageMetadata = MessageMetadata<TodoReferenceMetadata>;

const TODO_REFERENCE: TodoReferenceMetadata = {
  type: 'todo',
  id: 'todo-De-sensitization samples confirmed.',
  title: 'Confirm to clients the availability of dissensitized samples',
  subtitle: 'Solution design and validation · Key progress',
  payload: {
    status: 'pending',
    priority: 'high',
    owner: '01Agent',
  },
};

const normalizeDemoReferences = (reference: TodoMessageMetadata['reference']): TodoReferenceMetadata[] => {
  if (!reference) return [];

  const references = Array.isArray(reference) ? reference : [reference];
  return references.filter(
    (item): item is TodoReferenceMetadata => typeof item === 'object' && item !== null && !Array.isArray(item),
  );
};

const INITIAL_HISTORY = [
  {
    session_id: undefined,
    title: 'New Session',
  },
  {
    session_id: '486f8e451d644626',
    title: 'Multiple files',
  },
  {
    session_id: '9be102ad67b4453d',
    title: '/Business briefing',
  },
  {
    session_id: '9b2ed7ec24db41d1',
    title: 'Help me generate a business brief.',
  },
  {
    session_id: '1f1ac10271e54c52',
    title: 'Help me generate a business brief.',
  },
  {
    session_id: '17123620b6774003',
    title: 'The new book fair was planned.',
  },
  {
    session_id: '7789aab66c23452a',
    title: 'AgentX Project Resolution',
  },
  {
    session_id: '57ad87ec76d54d79',
    title: 'Generate onesingle_select, and select the option for the user\n\n',
  },
  {
    session_id: 'aa22a27c8b364dfb',
    title: 'Generate onesingle_select, and select the option for the user\n\n',
  },
  {
    session_id: 'c690aec2a9d54294',
    title: 'User Information Collection Form',
  },
  {
    session_id: '2b80df5a9e724106',
    title: 'SalesConditions for clarification of information',
  },
  {
    session_id: '4f2b8055569d44a7',
    title: 'Prevention of Internet addiction',
  },
  {
    session_id: '633ecf708f114948',
    title: 'Cyber-addiction prevention',
  },
  {
    session_id: '2fa7f40fb08a4a28',
    title: 'Cyber-addiction prevention',
  },
  {
    session_id: '9e364e7756a24fea',
    title: 'Guidelines for the use of the knowledge base',
  },
  {
    session_id: 'b25dbce22cbf4bd8',
    title: 'Knowledge Base Usage Guide',
  },
  {
    session_id: '6c3817d2daed4ff9',
    title: '6000DollariPhoneRecommendations',
  },
  {
    session_id: 'bf6476352cbf45d3',
    title: 'iPhone 16 Pro Max Price Configuration',
  },
  {
    session_id: '06c548f298764697',
    title: 'QuoteAgentDesign',
  },
  {
    session_id: '88fac24677024a8e',
    title: 'iPhone 16 ProPrice',
  },
  {
    session_id: '247d71bf171b4782',
    title: 'QuoteAgentBuilding',
  },
  {
    session_id: '07fe2959103f4390',
    title: 'Pre-sale quotationsAgent',
  },
];

const AgentDemo01 = () => {
  const agentXRef = useRef<AgentXHandle<TodoMessageMetadata>>(null);
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [activeSessionId, setActiveSessionId] = useState(history[0]?.session_id);
  const [selectedTodoId, setSelectedTodoId] = useState<string>();

  const createNewSession = () => {
    if (history.some((item) => item.session_id === undefined)) {
      setActiveSessionId(undefined);
      return;
    }
    const newChat = {
      title: 'New Session',
      session_id: undefined,
    };
    setHistory([newChat, ...history]);
    setActiveSessionId(newChat.session_id);
  };

  const renderHeader = () => {
    return (
      <div>
        <div className="w-full h-16 relative bg-white outline outline-1 outline-offset-[-1px] outline-gray-200 overflow-hidden">
          <div className="left-[16px] top-[12px] absolute justify-start text-neutral-400 text-xs font-normal font-['PingFang_SC'] leading-4">

            01Agent Following up.
          </div>
          <div className="left-[16px] top-[32px] absolute justify-start text-black text-base font-medium font-['PingFang_SC'] leading-6">

            Voting support plan
          </div>
          <div className="w-6 p-1 left-[360px] top-[20px] absolute rounded-sm inline-flex flex-col justify-center items-center gap-2.5">
            <div className="self-stretch text-center justify-center text-black text-sm font-normal font-['SF_Pro'] leading-4">
              􀌶
            </div>
          </div>
          <div className="w-6 p-1 left-[324px] top-[20px] absolute rounded-sm inline-flex flex-col justify-center items-center gap-2.5">
            <div className="self-stretch text-center justify-center text-black text-base font-normal font-['SF_Pro'] leading-4">
              􀣔
            </div>
          </div>
        </div>
        <div className="self-stretch h-10 bg-white border-b border-gray-200 flex items-center px-4 gap-3 overflow-hidden">
          <div
            className="flex-1 flex justify-start items-stretch h-full overflow-x-auto gap-5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {history.map((item) => {
              const isActive = item.session_id === activeSessionId;
              return (
                <button
                  key={item.session_id || 'new-session'}
                  onClick={() => setActiveSessionId(item.session_id)}
                  className={`relative flex-shrink-0 flex items-center border-0 bg-transparent cursor-pointer px-0 pb-0 whitespace-nowrap text-xs font-['PingFang_SC'] leading-6 transition-colors ${
                    isActive
                      ? 'text-black font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-black after:rounded-full'
                      : 'text-stone-400 font-normal hover:text-stone-600'
                  }`}
                >
                  {item.title.replace(/\n/g, '')}
                </button>
              );
            })}
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="w-6 h-6 flex items-center justify-center rounded-sm hover:bg-gray-100 cursor-pointer">
              <HistoryOutlined className="text-black text-sm" />
            </div>
            <div
              className="w-6 h-6 flex items-center justify-center rounded-sm hover:bg-gray-100 cursor-pointer"
              onClick={createNewSession}
            >
              <PlusOutlined className="text-black text-sm" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStartScreen = (context: WelcomeScreenContext) => {
    return (
      <div className="flex-1 w-full h-full flex flex-col justify-between pt-7 pb-2">
        <div className="w-full inline-flex flex-col justify-center items-center gap-3">
          <div className="self-stretch px-4 py-3 bg-stone-50 rounded-3xl outline outline-1 outline-offset-[-1px] outline-zinc-100 inline-flex justify-start items-center gap-1">
            <div className="flex-1 justify-start text-Light-CT1 text-sm font-normal font-['PingFang_SC'] leading-5">

              Can Kyouta offer the client now?
            </div>
            <div className="size-5 text-center justify-start text-stone-500 text-sm font-normal font-['SF_Pro'] leading-5">
              􀰑
            </div>
          </div>
          <div className="self-stretch px-4 py-3 bg-stone-50 rounded-3xl outline outline-1 outline-offset-[-1px] outline-zinc-100 inline-flex justify-start items-center gap-1">
            <div className="flex-1 justify-start text-Light-CT1 text-sm font-normal font-['PingFang_SC'] leading-5">

              How would cutting the client budget in half affect the plan and its risks?
            </div>
            <div className="size-5 text-center justify-start text-stone-500 text-sm font-normal font-['SF_Pro'] leading-5">
              􀰑
            </div>
          </div>
          <div className="self-stretch px-4 py-3 bg-stone-50 rounded-3xl outline outline-1 outline-offset-[-1px] outline-zinc-100 inline-flex justify-start items-center gap-1">
            <div className="flex-1 justify-start text-Light-CT1 text-sm font-normal font-['PingFang_SC'] leading-5">

              Generate a question-and-answer session for next round of client communication
            </div>
            <div className="size-5 text-center justify-start text-stone-500 text-sm font-normal font-['SF_Pro'] leading-5">
              􀰑
            </div>
          </div>
        </div>
        <div className="inline-flex justify-start items-center gap-2">
          {SKILLS.map((skill) => (
            <button
              key={skill.value}
              onClick={() => context.appendText(String((skill.label ?? skill.value) + ' '))}
              className="px-3 py-1 bg-white rounded-[20px] outline outline-1 outline-offset-[-1px] outline-gray-200 flex justify-start items-center gap-2.5 cursor-pointer hover:bg-gray-50 transition-colors border-0"
            >
              <span className="justify-center text-stone-500 text-xs font-normal font-['PingFang_SC'] leading-5">
                {skill.label ?? skill.value}
              </span>
            </button>
          ))}
        </div>
      </div>
    ) as React.ReactNode;
  };

  const handleTodoClick = () => {
    setSelectedTodoId(TODO_REFERENCE.id);
    agentXRef.current?.setMetadata({
      reference: TODO_REFERENCE,
    });
    agentXRef.current?.focus();
  };

  const renderMessageMetadata = ({
    metadata,
    variant,
    defaultRenderer,
    onReferenceRemove,
  }: MessageMetadataRenderContext<TodoMessageMetadata>) => {
    const references = normalizeDemoReferences(metadata.reference);

    if (references.length === 0) {
      return defaultRenderer;
    }

    return (
      <div className={`flex flex-col gap-2 max-w-full ${variant === 'message' ? 'items-end mb-2' : 'w-full'}`}>
        {references.map((reference, index) => {
          const payload = reference.payload;
          const cardKey = reference.id || `${reference.type || 'reference'}-${index}`;

          return (
            <div
              key={cardKey}
              className={`relative rounded-[18px] border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ${
                variant === 'draft' ? 'w-full' : 'w-[472px] max-w-full'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 rounded-[12px] bg-black text-white flex items-center justify-center text-[14px] font-medium">

                  - Wait.
                </div>
                <div className="min-w-0 flex-1 pr-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[12px] leading-4 text-[#6B7280]">
                      open_platform
                    </span>
                    {payload?.priority ? (
                      <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[12px] leading-4 text-[#92400E]">
                        {payload.priority}
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-[15px] font-medium leading-5 text-[#111827]">
                    {reference.title || reference.name || reference.content || 'To-do Reference'}
                  </div>
                  {reference.subtitle || reference.description ? (
                    <div className="mt-1 truncate text-[13px] leading-5 text-[#6B7280]">
                      {reference.subtitle || reference.description}
                    </div>
                  ) : null}
                  {payload?.owner || payload?.status ? (
                    <div className="mt-3 flex items-center gap-2 text-[12px] leading-4 text-[#9CA3AF]">
                      {payload.owner ? <span>Responsible:{payload.owner}</span> : null}
                      {payload.status ? <span>Status:{payload.status}</span> : null}
                    </div>
                  ) : null}
                </div>
              </div>
              {variant === 'draft' && onReferenceRemove ? (
                <button
                  type="button"
                  className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center border-0 bg-transparent p-0 text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
                  aria-label="Remove reference"
                  onClick={onReferenceRemove}
                >
                  <CloseOutlined style={{ fontSize: 14 }} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-row">
      <div className="flex-1 p-8 bg-[#F7F7F7]">
        <div className="max-w-[420px]">
          <div className="text-[18px] leading-7 font-medium text-black mb-2">To-do</div>
          <div className="text-[13px] leading-5 text-[#999] mb-4">Click to do so and you will enter the right query box as a reference card.</div>
          <button
            type="button"
            onClick={handleTodoClick}
            className={`w-full text-left rounded-[16px] border bg-white px-4 py-4 shadow-[0_6px_24px_rgba(0,0,0,0.04)] cursor-pointer transition-all ${
              selectedTodoId === TODO_REFERENCE.id
                ? 'border-black/30 ring-2 ring-black/5'
                : 'border-[#EAEAEA] hover:border-black/20 hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-10 h-10 rounded-[12px] bg-[#F4F4F4] flex items-center justify-center shrink-0">
                <span className="text-[18px] leading-5 text-black/45">☷</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] leading-4 text-[#999] mb-1">To-do</div>
                <div className="text-[16px] leading-[22px] font-medium text-black truncate">{TODO_REFERENCE.title}</div>
                <div className="mt-1 text-[13px] leading-5 text-[#999] truncate">{TODO_REFERENCE.subtitle}</div>
              </div>
            </div>
          </button>
        </div>
      </div>
      <div className="w-100">
        <AgentX<TodoMessageMetadata>
          ref={agentXRef}
          agentId="01"
          placeholder="Question 01Agent"
          headerNode={renderHeader}
          welcomeScreen={renderStartScreen}
          senderConfig={{ skills: SKILLS, inputMode: 'singleLine' }}
          renderMessageMetadata={renderMessageMetadata}
          sessionId={activeSessionId}
          layoutConfig={{
            showWorkspace: false,
            narrowMode: true,
          }}
          sessionConfig={{
            enableRouting: false,
            // enableSessionLoading: activeSessionId !== undefined,
          }}
          filePreviewConfig={{
            onPreview: (context) => {
              console.log('onPreview', context);
              return true;
            },
          }}
          onSessionCreated={(session) => {
            console.log(session);
            // Assign the newly created session ID to history items that do not have one yet.
            const newHistory = history.map((item) =>
              item.session_id === undefined ? { ...item, session_id: session.session_id } : item,
            );
            setHistory(newHistory);
            setActiveSessionId(newHistory[0]?.session_id);
          }}
          classNames={
            {
              // conversationArea: 'bg-red-50',
            }
          }
          styles={{
            conversationArea: {
              backgroundColor: '#fff',
            },
          }}
        />
      </div>
    </div>
  );
};

export default AgentDemo01;
