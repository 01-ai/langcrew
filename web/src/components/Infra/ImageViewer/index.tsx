import React, { FC } from 'react';
import { Image, ImageProps } from 'antd';
import type { GroupConsumerProps } from 'rc-image/lib/PreviewGroup';

interface ImageViewerProps extends ImageProps {
  srcs?: string[];
  group?: boolean;
  groupOptions?: GroupConsumerProps;
}

const ImageViewer: FC<ImageViewerProps> = ({ groupOptions, group, srcs, ...props }) => {
  // mutilple images mode
  if (srcs && srcs.length) {
    return (
      <Image.PreviewGroup {...groupOptions}>
        {srcs.map((src, index) => (
          <Image {...props} src={src} key={index} />
        ))}
      </Image.PreviewGroup>
    );
  }

  // album mode
  if (group) {
    return (
      <Image.PreviewGroup {...groupOptions}>
        <Image {...props} />
      </Image.PreviewGroup>
    );
  }

  // single mode
  return <Image {...props} />;
};

export default ImageViewer;
