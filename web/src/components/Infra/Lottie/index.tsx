import Lottie from 'lottie-react';
import React from 'react';

interface LottieComponentProps {
  animationData: any;
  style?: React.CSSProperties;
}

const LottieComponent: React.FC<LottieComponentProps> = ({ animationData, style }) => {
  return <Lottie animationData={animationData} loop style={style} />;
};

export default LottieComponent;
