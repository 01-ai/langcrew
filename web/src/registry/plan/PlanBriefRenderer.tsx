import React from 'react';
import { BriefRendererProps } from '..';
import Planner from '@/components/Agent/Chatbot/Planner';
import { MessagePlanChunk } from '@/types';

const PlanBriefRenderer: React.FC<BriefRendererProps> = ({ message, citations }) => {
  return <Planner data={(message as MessagePlanChunk).children} citations={citations} />;
};

export default PlanBriefRenderer;
