import LottieComponent from '../Lottie';
import animationData from '@/assets/lottie/running.json';
import React from 'react';

const Loading = ({ size = 16 }: { size?: number }) => {
  return <LottieComponent animationData={animationData} style={{ width: `${size}px`, height: `${size}px` }} />;
};

export default Loading;
