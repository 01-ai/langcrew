import React, { useRef, useEffect } from 'react';

interface LiElementProps {
  children?: React.ReactNode;
  className?: string;
  ordered?: boolean;
}

const LiElement: React.FC<LiElementProps> = ({ children, className, ...props }) => {
  const liRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const liElement = entries?.[0]?.target as HTMLLIElement;
      const math = liElement?.querySelectorAll<HTMLSpanElement>('.math')?.[0];

      if (math) {
        const top = math?.offsetTop === 0 ? math?.clientHeight / 2 - 10 : 0;

        liElement?.style?.setProperty('--before-top', `${top}px`);
      }
    });

    if (liRef?.current) {
      observer.observe(liRef?.current as HTMLLIElement);
    }

    return () => observer.disconnect();
  }, []);

  // check if it is a task list item
  const isTaskListItem = className?.includes('task-list-item');

  // filter out non-standard DOM attributes
  const { ordered, ...domProps } = props;

  return (
    <li ref={liRef} className={className} {...domProps} style={isTaskListItem ? { listStyle: 'none' } : undefined}>
      {children}
    </li>
  );
};

export default LiElement;
