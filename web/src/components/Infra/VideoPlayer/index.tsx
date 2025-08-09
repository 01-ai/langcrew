import React, { FC } from 'react';
import ReactPlayer, { ReactPlayerProps } from 'react-player';

interface VideoPlayerProps extends ReactPlayerProps {
  rootClassName?: string;
  style?: Record<string, string | number>;
}

// Props Docs: https://github.com/cookpete/react-player?tab=readme-ov-file#props
const VideoPlayer: FC<VideoPlayerProps> = ({ rootClassName = '', style, ...props }) => {
  return (
    <div className={rootClassName} style={style}>
      <ReactPlayer {...props} />
    </div>
  );
};

export default VideoPlayer;
