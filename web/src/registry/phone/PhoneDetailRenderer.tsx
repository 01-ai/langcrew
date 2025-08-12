import React from 'react';
import { DetailRendererProps } from '..';
import { isJsonString } from '@/utils/json';
import useToolContent from '../common/useToolContent';
import { MessageToolChunk } from '@/types';
import { CloudPhone } from '@/components/Infra';

const PhoneDetailRenderer: React.FC<DetailRendererProps> = ({ message, isRealTime }) => {
  const { content } = useToolContent(message as unknown as MessageToolChunk);
  const data = isJsonString(content) ? JSON.parse(content) : {};

  const imageUrl = data.current_state?.screenshot_url;

  return (
    <div className="w-full h-full flex justify-center items-center">
      <CloudPhone
        phoneRender={() => (
          <div className="w-full h-full flex justify-center items-center bg-black">
            <img src={imageUrl} className="max-w-full max-h-full w-full h-full object-contain" />
          </div>
        )}
      />
    </div>
  );
};

export default PhoneDetailRenderer;
