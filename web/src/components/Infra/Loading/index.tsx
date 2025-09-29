import LoadingSvg from '@/assets/svg/loading.svg?react';

import React from 'react';

const Loading = ({ size = 16 }: { size?: number }) => {
  return <LoadingSvg style={{ width: `${size}px`, height: `${size}px` }} className="animate-spin" />;
};

export default Loading;
