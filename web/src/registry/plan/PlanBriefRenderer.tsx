import React from 'react';
import { BriefRendererProps } from '..';
import Planner from '@/components/Agent/Chatbot/Planner';
import { MessagePlanChunk } from '@/types';

const PlanBriefRenderer: React.FC<BriefRendererProps> = ({ message }) => {
  return <Planner data={(message as MessagePlanChunk).children} />;
};

export default PlanBriefRenderer;
