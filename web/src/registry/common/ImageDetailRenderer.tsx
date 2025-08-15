import React from 'react';
import { Image } from 'antd';

interface ImageDetailRendererProps {
  imageUrl: string;
}

const ImageDetailRenderer: React.FC<ImageDetailRendererProps> = ({ imageUrl }) => {
  if (!imageUrl) {
    return (
      <div className="w-full h-full flex justify-center items-center bg-black">
        <div className="text-white">图片地址不存在</div>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex justify-center items-center bg-black">
      <Image
        src={imageUrl}
        className="max-w-full max-h-full w-full h-full object-contain"
        wrapperClassName="max-w-full max-h-full w-full h-full"
      />
    </div>
  );
};

export default ImageDetailRenderer;
