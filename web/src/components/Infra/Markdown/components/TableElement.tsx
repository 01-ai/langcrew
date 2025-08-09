import React from 'react';

const TableElement: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>{children}</table>
    </div>
  );
};

export default TableElement;
