import React from 'react';
import classNames from 'classnames';
import ChevronIcon from '@/assets/svg/planner-expand.svg?react';

interface ExpandCollapseIconProps {
  expanded: boolean;
  className?: string;
}

const ExpandCollapseIcon: React.FC<ExpandCollapseIconProps> = ({ expanded, className }) => {
  return (
    <span
      className={classNames(
        'inline-flex items-center justify-center transition-transform duration-200 ease-in-out',
        expanded && 'rotate-180',
        className,
      )}
      aria-hidden
    >
      <ChevronIcon />
    </span>
  );
};

export default ExpandCollapseIcon;
