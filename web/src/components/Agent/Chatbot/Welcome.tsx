import { Welcome } from '@ant-design/x';
import React from 'react';

const WelcomeContainer: React.FC = () => {
  return (
    <div className="flex">
      <Welcome
        variant="borderless"
        icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
        title="Welcome to LangCrew"
        description="Provide the agent with a mission."
        styles={{
          title: {
            fontSize: '48px',
            fontWeight: 'bold',
          },
          description: {
            fontSize: '26px',
            textAlign: 'center',
          },
        }}
      />
    </div>
  );
};

export default WelcomeContainer;
