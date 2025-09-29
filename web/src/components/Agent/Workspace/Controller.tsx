import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Slider } from 'antd';


import { CustomIcon } from '@/components/Agent/Chatbot/Sender/components';
import { useAgentStore } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';
import './index.less';

const Controller: React.FC<{ onRealTimeChange: (isRealTime: boolean) => void }> = ({ onRealTimeChange }) => {
  // current displayed step
  const [step, setStep] = useState(0);
  const { t } = useTranslation();

  const { senderSending, workspaceMessages, pipelineTargetMessage, setPipelineTargetMessage } = useAgentStore();

  // total steps
  const totalSteps = useMemo(() => workspaceMessages.length, [workspaceMessages]);

  // if pipelineTargetMessage is empty or the number of steps in sending is equal to the total number of steps, it is considered to be real-time
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

  // manually jump to the specified step, at this time, pipelineTargetMessage needs to be set
  const manualToStep = useCallback(
    (step: number) => {
      setStep(step);
      setPipelineTargetMessage(workspaceMessages[step > 1 ? step - 1 : 0]);
    },
    [setPipelineTargetMessage, workspaceMessages],
  );

  // handle the previous step
  const handlePreStep = useCallback(() => {
    const currentStep = step - 1;
    if (currentStep > 0) {
      manualToStep(currentStep);
    }
  }, [manualToStep, step]);

  // handle the next step
  const handleNextStep = useCallback(() => {
    manualToStep(step + 1 < totalSteps ? step + 1 : totalSteps);
  }, [manualToStep, step, totalSteps]);

  // handle step change
  const handleStepChange = useCallback(
    (value) => {
      if (value !== 0) {
        manualToStep(value);
      }
    },
    [manualToStep],
  );

  // return to real-time
  const returnToRealTime = useCallback(() => {
    setStep(totalSteps);
    setPipelineTargetMessage(null);
  }, [setPipelineTargetMessage, totalSteps]);

  // if the current is real-time, when the number of steps changes, jump to the total number of steps
  useEffect(() => {
    if (isRealTime) {
      setStep(totalSteps);
    }
  }, [isRealTime, totalSteps]);

  // if pipelineTargetMessage changes, jump to the corresponding step
  useEffect(() => {
    if (pipelineTargetMessage) {
      setStep(workspaceMessages.findIndex((message) => message.id === pipelineTargetMessage.id) + 1);
    }
  }, [pipelineTargetMessage, workspaceMessages]);

  return (
    <div className="agentx-controller relative flex w-full gap-[12px] px-[18px] py-2">
      {!isRealTime && step !== totalSteps && (
        <div
          className="absolute left-1/2 top-[-36px] z-10 -translate-x-1/2 -translate-y-1/2 py-3 px-5 font-medium rounded-full bg-[#fff] shadow-[0px_2px_20px_0px_rgba(0,_0,_0,_0.12)] cursor-pointer flex items-center gap-[4px]"
          onClick={returnToRealTime}
        >
          <CustomIcon type="caretRight" style={{ fontSize: '16px' }} />
          {t('workspace.controller.jump-to-real-time')}
        </div>
      )}

      <div className="flex items-center gap-[4px]">
        <Button
          type="link"
          icon={<CustomIcon type="stepBackward" />}
          style={{ width: 20, padding: 0, fontSize: '20px', color: '#000' }}
          onClick={handlePreStep}
        />
        <Button
          type="link"
          icon={<CustomIcon type="stepForward" />}
          style={{ width: 20, padding: 0, fontSize: '20px', color: '#000' }}
          onClick={handleNextStep}
        />
      </div>

      <div className="flex-1">
        {totalSteps <= 1 && <Slider min={0} max={totalSteps} value={step} onChange={handleStepChange} />}
        {totalSteps > 1 && <Slider min={1} max={totalSteps} value={step} onChange={handleStepChange} />}
      </div>

      <div className="flex items-center gap-[8px]">
        <Badge status={isRealTime && senderSending ? 'success' : 'default'} />
        <span>{t('workspace.controller.real-time')}</span>
      </div>
    </div>
  );
};

export default Controller;
