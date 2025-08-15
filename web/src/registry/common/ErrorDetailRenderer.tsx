import React from 'react';

interface ErrorDetailRendererProps {
  errorMessage: string;
}

const ErrorDetailRenderer: React.FC<ErrorDetailRendererProps> = ({ errorMessage }) => {
  return (
    <div className="w-full h-full flex justify-center items-center">
      <div className="text-red-500">{errorMessage}</div>
    </div>
  );
};

export default ErrorDetailRenderer;
