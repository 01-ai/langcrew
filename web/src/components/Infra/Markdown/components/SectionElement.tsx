import React from 'react';
import classNames from 'classnames';
import { getDevice } from '../helpers';
import CustomIcon from './CustomIcon';

interface SectionElementProps {
  className?: string;
  type?: string;
  title?: string;
  children?: React.ReactNode;
}

const SectionElement: React.FC<SectionElementProps> = ({ className = '', type, title, children }) => {
  return (
    <section className={className}>
      {type ? (
        <>
          <h6>
            <CustomIcon className="section-icon" type={type} />
            {title}
          </h6>
          <div
            className={classNames({
              [`${type}-content`]: true,
              [`${type}-${getDevice()}-content`]: true,
            })}
          >
            {children}
          </div>
        </>
      ) : (
        children
      )}
    </section>
  );
};

export default SectionElement;
