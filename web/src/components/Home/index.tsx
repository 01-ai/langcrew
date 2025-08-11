import React from 'react';
import Sender from '@/components/Agent/Chatbot/Sender';
import Welcome from '@/components/Agent/Chatbot/Welcome';
import bgUrl from '@/assets/png/bg.png';

interface HomeProps {
  senderVisible?: boolean;
  headerNode?: React.ReactNode;
  footerNode?: React.ReactNode;
}

const Home: React.FC<HomeProps> = ({ senderVisible = true, headerNode, footerNode }) => {
  return (
    <div
      className="h-full w-full py-14 bg-top bg-no-repeat bg-[size:100%] overflow-auto"
      style={{ backgroundImage: `url(${bgUrl})` }}
    >
      <div
        className={`max-w-[1112px] mx-auto h-full w-full flex flex-col items-center gap-[60px] ${
          headerNode ? 'justify-start' : 'justify-center'
        }`}
      >
        {headerNode ? headerNode : <Welcome />}
        {senderVisible && <Sender />}
        {footerNode ? footerNode : null}
      </div>
    </div>
  );
};

export default Home;
