import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Slider } from 'antd';


import { CustomIcon } from '@/components/Agent/Chatbot/Sender/components';
import { useAgentStore } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';
import './index.less';

const Controller: React.FC<{ onRealTimeChange: (isRealTime: boolean) => void }> = ({ onRealTimeChange }) => {
  // 当前显示的
  const [step, setStep] = useState(0);
  const { t } = useTranslation();

  const { senderSending, workspaceMessages, pipelineTargetMessage, setPipelineTargetMessage } = useAgentStore();

  // 总步数
  const totalSteps = useMemo(() => workspaceMessages.length, [workspaceMessages]);

  // 如果pipelineTargetMessage为空 或者 发送中步数与总步数一致，则认为是实时
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

  // 手动跳转到指定步骤，这时候需要设置pipelineTargetMessage
  const manualToStep = useCallback(
    (step: number) => {
      setStep(step);
      setPipelineTargetMessage(workspaceMessages[step > 1 ? step - 1 : 0]);
    },
    [setPipelineTargetMessage, workspaceMessages],
  );

  // 处理上一步
  const handlePreStep = useCallback(() => {
    const currentStep = step - 1;
    if (currentStep > 0) {
      manualToStep(currentStep);
    }
  }, [manualToStep, step]);

  // 处理下一步
  const handleNextStep = useCallback(() => {
    manualToStep(step + 1 < totalSteps ? step + 1 : totalSteps);
  }, [manualToStep, step, totalSteps]);

  // 处理步骤变化
  const handleStepChange = useCallback(
    (value) => {
      if (value !== 0) {
        manualToStep(value);
      }
    },
    [manualToStep],
  );

  // 返回实时
  const returnToRealTime = useCallback(() => {
    setStep(totalSteps);
    setPipelineTargetMessage(null);
  }, [setPipelineTargetMessage, totalSteps]);

  // 如果当前是实时，在步数变化时，则跳转到总步数
  useEffect(() => {
    if (isRealTime) {
      setStep(totalSteps);
    }
  }, [isRealTime, totalSteps]);

  // 如果pipelineTargetMessage发生变化，则跳转到对应步骤
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
