import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Slider } from 'antd';


import { CustomIcon } from '@/components/Agent/Chatbot/Sender/components';
import { useAgentStore } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';
import './index.less';

const Controller: React.FC<{ onRealTimeChange: (isRealTime: boolean) => void }> = ({ onRealTimeChange }) => {
  // Current Displayed
  const [step, setStep] = useState(0);
  const { t } = useTranslation();

  const { senderSending, workspaceMessages, pipelineTargetMessage, setPipelineTargetMessage } = useAgentStore();

  // Total steps
  const totalSteps = useMemo(() => workspaceMessages.length, [workspaceMessages]);

  // IfpipelineTargetMessageis empty or send a medium step to the total step, which is considered real time
  const isRealTime = useMemo(
    () => !pipelineTargetMessage || (senderSending && step === totalSteps),
    [pipelineTargetMessage, senderSending, step, totalSteps],
  );

  const showRealTime = useMemo(() => {
    return !isRealTime && step !== totalSteps;
  }, [isRealTime, step, totalSteps]);

  useEffect(() => {
    onRealTimeChange(!showRealTime);
  }, [showRealTime, onRealTimeChange]);

  // Manually jump to specified step, and this time you need settingspipelineTargetMessage
  const manualToStep = useCallback(
    (step: number) => {
      setStep(step);
      setPipelineTargetMessage(workspaceMessages[step > 1 ? step - 1 : 0]);
    },
    [setPipelineTargetMessage, workspaceMessages],
  );

  // Deal with previous step
  const handlePreStep = useCallback(() => {
    const currentStep = step - 1;
    if (currentStep > 0) {
      manualToStep(currentStep);
    }
  }, [manualToStep, step]);

  // Deal with next steps
  const handleNextStep = useCallback(() => {
    manualToStep(step + 1 < totalSteps ? step + 1 : totalSteps);
  }, [manualToStep, step, totalSteps]);

  // Process step changes
  const handleStepChange = useCallback(
    (value) => {
      if (value !== 0) {
        manualToStep(value);
      }
    },
    [manualToStep],
  );

  // Return real time
  const returnToRealTime = useCallback(() => {
    setStep(totalSteps);
    setPipelineTargetMessage(null);
  }, [setPipelineTargetMessage, totalSteps]);

  // If the current is real time, then jump to the total number of steps when the number of steps changes
  useEffect(() => {
    if (isRealTime) {
      setStep(totalSteps);
    }
  }, [isRealTime, totalSteps]);

  // IfpipelineTargetMessageChange, jump to the corresponding step
  useEffect(() => {
    if (pipelineTargetMessage) {
      setStep(workspaceMessages.findIndex((message) => message.id === pipelineTargetMessage.id) + 1);
    }
  }, [pipelineTargetMessage, workspaceMessages]);

  return (
    <div className="agentx-controller relative flex items-center w-full gap-[8px] px-4 h-[52px]">
      {!isRealTime && step !== totalSteps && (
        <div
          className="absolute left-1/2 top-[-36px] z-10 -translate-x-1/2 -translate-y-1/2 py-3 px-5 font-medium rounded-full bg-[#fff] shadow-[0px_2px_20px_0px_rgba(0,_0,_0,_0.12)] cursor-pointer flex items-center gap-[4px]"
          onClick={returnToRealTime}
        >
          <CustomIcon type="caretRight" style={{ fontSize: '16px' }} />
          {t('workspace.controller.jump-to-real-time')}
        </div>
      )}

      <div className="flex items-center gap-[4px] flex-shrink-0">
        <Button
          type="text"
          icon={<CustomIcon type="stepBackward" style={{ fontSize: 20 }} />}
          className="!flex !items-center !justify-center !w-5 !h-5 !p-0 !text-black hover:!bg-black/5"
          onClick={handlePreStep}
        />
        <Button
          type="text"
          icon={<CustomIcon type="stepForward" style={{ fontSize: 20 }} />}
          className="!flex !items-center !justify-center !w-5 !h-5 !p-0 !text-black hover:!bg-black/5"
          onClick={handleNextStep}
        />
      </div>

      <div className="flex-1 px-2 flex items-center">
        {totalSteps <= 1 && (
          <Slider className="w-full" min={0} max={totalSteps} value={step} onChange={handleStepChange} tooltip={{ open: false }} />
        )}
        {totalSteps > 1 && (
          <Slider className="w-full" min={1} max={totalSteps} value={step} onChange={handleStepChange} tooltip={{ open: false }} />
        )}
      </div>

      <div className="flex items-center gap-[6px] flex-shrink-0">
        <div className="flex items-center gap-[4px]">
          <Badge status={isRealTime && senderSending ? 'success' : 'default'} className="scale-75" />
          <span className="text-sm text-black">{t('workspace.controller.real-time')}</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-[#00C10A]" />
      </div>
    </div>
  );
};

export default Controller;
