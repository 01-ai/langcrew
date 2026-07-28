import AgentX from '@/AgentX';
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const Replay = () => {
  const { shareId } = useParams();
  const [searchParams] = useSearchParams();
  const sharePwd = searchParams.get('pwd');

  return (
    <div className="w-screen h-screen">
      <AgentX basePath="/replay" agentId={'01'} shareId={shareId} sharePassword={sharePwd} />
    </div>
  );
};

export default Replay;
