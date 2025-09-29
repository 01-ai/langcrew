import React from 'react';
import Sender from '@/components/Agent/Chatbot/Sender';
import Welcome from '@/components/Agent/Chatbot/Welcome';
import bgUrl from '@/assets/png/bg.png';

const Home: React.FC = () => {
  return (
    <div
      className="h-full w-full py-14 bg-cover bg-no-repeat overflow-auto"
      style={{ backgroundImage: `url(${bgUrl})` }}
    >
      <div className={`max-w-[1112px] mx-auto h-full w-full flex flex-col items-center gap-[60px] justify-center `}>
        <Welcome />
        <Sender />
      </div>
    </div>
  );
};

export default Home;
