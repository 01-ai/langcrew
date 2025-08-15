import React from 'react';

interface OlElementProps {
  start?: number;
  children?: React.ReactNode;
}

const OlElement: React.FC<OlElementProps> = ({ children, start = 1 }) => {
  return (
    <ol start={start} style={{ counterReset: `li ${start - 1}` }}>
      {children}
    </ol>
  );
};

export default OlElement;
