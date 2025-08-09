import Icon from '@ant-design/icons';
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import React from 'react';
import classNames from 'classnames';
import {
  linkSvg,
  databaseSvg,
  onlineSvg,
  mcpSvg,
  stepBackwardSvg,
  stepForwardSvg,
  caretRightSvg,
  phoneBackSvg,
  phoneHomeSvg,
  phoneMenuSvg,
} from './svgs';

interface SvgMap {
  [key: string]: () => React.ReactElement;
}

const svgMap: SvgMap = {
  database: databaseSvg,
  link: linkSvg,
  online: onlineSvg,
  mcp: mcpSvg,
  stepBackward: stepBackwardSvg,
  stepForward: stepForwardSvg,
  caretRight: caretRightSvg,
  phoneBack: phoneBackSvg,
  phoneHome: phoneHomeSvg,
  phoneMenu: phoneMenuSvg,
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
