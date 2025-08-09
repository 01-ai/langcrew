import React from 'react';
import { BriefRendererProps } from '..';
import Loading from '@/components/Infra/Loading';

const LiveStatusBriefRenderer: React.FC<BriefRendererProps> = ({ message }) => {
  return (
    <div className="flex gap-2 items-center">
      <Loading /> {message.content}
    </div>
  );
};

export default LiveStatusBriefRenderer;
