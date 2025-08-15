import React from 'react';

type ImgElementProps = React.ImgHTMLAttributes<HTMLImageElement>;

const ImgElement: React.FC<ImgElementProps> = ({ src, alt }) => {
  return (
    <span className="img-wrapper">
      <img src={src} alt={alt} />
    </span>
  );
};

export default ImgElement;
