import React, { useEffect } from 'react';
import { Flex } from 'antd';
import Sender from '@/components/Agent/Chatbot/Sender';
import { useAgentStore } from '@/store';

const Home: React.FC = () => {
  const { setBasePath, setAgentId, setMode, setSenderKnowledgeBases, setSenderMCPTools } = useAgentStore();

  useEffect(() => {
    setBasePath('/chat');
    setAgentId('01');
  }, [setBasePath, setAgentId, setMode, setSenderKnowledgeBases, setSenderMCPTools]);

  return (
    <div className="h-screen w-full bg-[url('@/assets/png/bg.png')] bg-cover bg-no-repeat bg-[length:100%_auto] overflow-hidden">
      <Flex vertical justify="center" align="center" className="h-full px-4">
        <div className="w-full max-w-[800px]">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 text-gray-800">Welcome to LangCrew</h1>
            <p className="text-lg text-gray-600">Provide the agent with a mission.</p>
          </div>
          <Sender />
        </div>
      </Flex>
    </div>
  );
};

export default Home;
