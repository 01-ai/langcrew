import React from 'react';
import { ToolBriefRendererProps } from '..';
import { Alert } from 'antd';
import { Markdown } from '@/components/Infra';
import { useTranslation } from '@/hooks/useTranslation';
import { UserInputChunk } from '@/types';
import eventBus from '@/utils/eventBus';
import { ToolIconCircle } from '../common/icons';
import PhoneHIL from '../common/PhoneHIL';
import useHumanInTheLoop from '../common/useHumanInTheLoop';
import { DynamicFormRenderer } from '@/components/Infra/DynamicForm';

const UserInputBriefRenderer: React.FC<ToolBriefRendererProps> = ({ message }) => {
  const { t } = useTranslation();

  const userInputMessage = message as UserInputChunk;
  const [formLoading, setFormLoading] = React.useState(false);

  const { showTakeOverBrowser, showTakeOverPhone, showOptionContainer, userInputable } =
    useHumanInTheLoop(userInputMessage);

  const handleClick = (option: string) => {
    if (userInputable) {
      eventBus.emit('user_input_click', option);
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (!userInputable) return;

    setFormLoading(true);
    try {
      // Send form data as user input
      eventBus.emit('user_input_click', JSON.stringify(data));
    } finally {
      setFormLoading(false);
    }
  };

  // Get dynamic form schema from the new data structure
  const getFormSchema = () => {
    return userInputMessage.detail?.interrupt_data?.form_schema;
  };

  const renderUserInput = () => {
    // Dynamic form mode
    const formSchema = getFormSchema();
    if (formSchema) {
      return (
        <div className="flex gap-2 items-start justify-between p-2 pl-4 rounded-xl border border-[#ededed]">
          <div className="flex-1">
            <Markdown content={userInputMessage.content} />
            <DynamicFormRenderer
              schema={formSchema}
              onSubmit={handleFormSubmit}
              loading={formLoading}
              disabled={!userInputable}
            />
          </div>
        </div>
      );
    }

    // if it needs to take over the browser, show the take over browser button
    if (showTakeOverBrowser) {
      return (
        <div className="flex gap-2 items-center justify-between p-2 pl-4 rounded-xl border border-[#ededed]">
          <Markdown content={userInputMessage.content} />
          <div className="flex items-center gap-2">
            <a
              href={userInputMessage.detail?.interrupt_data?.intervention_info?.intervention_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                if (!userInputable) {
                  e.preventDefault();
                  return;
                }
              }}
              className={`px-6 py-2 rounded-md text-[14px] w-fit text-white whitespace-nowrap ${
                userInputable ? 'bg-black cursor-pointer' : 'bg-gray-700 cursor-not-allowed'
              }`}
            >
              {t('task.user_input.take_over_browser.button')}
            </a>
          </div>
        </div>
      );
    }
    // if it needs to take over the phone, show the take over phone button
    if (showTakeOverPhone) {
      return <PhoneHIL userInputable={userInputable} />;
    }
    // if there are options, show the option container
    if (showOptionContainer) {
      return (
        <div className="flex gap-2 items-center justify-between p-2 pl-4 rounded-xl border border-[#ededed]">
          <Markdown content={userInputMessage.content} />
          <div className="flex items-center gap-2">
            {userInputMessage?.detail?.options?.map((option) => (
              <div
                key={option}
                className={`px-6 py-2 rounded-md text-[14px] w-fit text-white whitespace-nowrap ${
                  userInputable ? 'bg-black cursor-pointer' : 'bg-gray-700 cursor-not-allowed'
                }
                  `}
                onClick={() => {
                  handleClick(option);
                }}
              >
                {option}
              </div>
            ))}
          </div>
        </div>
      );
    }
    // otherwise show the content
    return <Markdown content={message.content} />;
  };

  return (
    <>
      {renderUserInput()}

      <div className="py-1.5 px-3 rounded-2xl flex items-center gap-1 bg-[#FFEDC9] text-[14px] w-fit text-[#E07801]">
        <ToolIconCircle />
        <div>{t('user.input.brief')}</div>
      </div>
    </>
  );
  return <Alert message={<Markdown content={message.content} />} type="warning" />;
};

export default UserInputBriefRenderer;
