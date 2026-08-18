import React from 'react';
import { Image } from 'antd';
import { useTranslation } from '@/hooks/useTranslation';

interface ImageDetailRendererProps {
  imageUrl: string;
}

const ImageDetailRenderer: React.FC<ImageDetailRendererProps> = ({ imageUrl }) => {
  const { t } = useTranslation();
  if (!imageUrl) {
    return (
      <div className="w-full h-full flex justify-center items-center bg-black">
        <div className="text-white">{t('error.image.url_missing')}</div>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex justify-center items-center bg-black">
      <Image
        src={imageUrl}
        className="max-w-full max-h-full w-full h-full object-contain"
        classNames={{
          root: 'max-w-full max-h-full w-full h-full',
        }}
      />
    </div>
  );
};

export default ImageDetailRenderer;
