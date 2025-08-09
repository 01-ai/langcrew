import Icon from '@ant-design/icons';
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import React from 'react';
import classNames from 'classnames';

import { copySvg } from './svgs';

interface SvgMap {
  [key: string]: () => React.ReactElement;
}

const svgMap: SvgMap = {
  copy: copySvg,
};

interface CustomIconProps extends Partial<CustomIconComponentProps> {
  type: string;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
  onMouseDown?: (event: React.MouseEvent) => void;
}

const CustomIcon: React.FC<CustomIconProps> = ({ type, className = '', onClick, onMouseDown, ...otherProps }) => {
  const iconRender = () => {
    const events = {
      onClick,
      onMouseDown,
    };

    return (
      <Icon
        className={classNames({
          'flex justify-start items-center': true,
          [className]: true,
        })}
        component={svgMap[type]}
        {...events}
        {...otherProps}
      />
    );
  };

  return <div className="flex justify-center items-center">{iconRender()}</div>;
};

export default CustomIcon;
