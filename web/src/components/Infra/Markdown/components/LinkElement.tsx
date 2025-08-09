import React from "react";

type LinkElementProps = React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>;

const LinkElement: React.FC<LinkElementProps> = ({ href, children }) => {
  return (
    <a href={href} target="_blank">
      {children}
    </a>
  );
};

export default LinkElement;
