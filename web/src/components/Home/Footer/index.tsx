import React, { FC, useCallback, useState } from 'react';
import cn from 'classnames';
import { listData, EmployeeType } from '../mock';
import styled from './styled.module.less';
import AreaSvg from '@/assets/svg/staff/area-icon.svg';
import { useTranslation } from '@/hooks/useTranslation';

interface FooterProps {
  onSelect?: (item: EmployeeType) => void;
}

const Footer: FC<FooterProps> = ({ onSelect }) => {
  const { t } = useTranslation();
  const [currentItem, setCurrentItem] = useState<EmployeeType | null>(null);
  const onSelectItem = useCallback(
    (item: EmployeeType) => {
      setCurrentItem(item);
      onSelect?.(item);
    },
    [onSelect],
  );

  return (
    <>
      <div className={styled['staff-section']}>
        <h2>{t('home.cases.title')}</h2>
        <div className={styled['staff-card-wrapper']}>
          {listData.map((item: EmployeeType) => (
            <div
              className={cn(
                styled['staff-card'],
                item.super_employee_id === currentItem?.super_employee_id && styled['active'],
                'flex flex-col gap-3',
              )}
              key={item.id}
              onClick={() => onSelectItem(item)}
            >
              <div className={cn(styled['staff-card-header'], 'flex items-center gap-4')}>
                <img src={item.avatar} alt="" />
                <div className="flex flex-col gap-3">
                  <h3>{item.name}</h3>
                  <div className="flex gap-1.5 flex-wrap">
                    {item.agent_tools.map((tool, index) => (
                      <div className={cn(styled['staff-card-label'], 'flex items-center gap-1')} key={index}>
                        <img src={tool.tool_avatar} alt="" />
                        <span>{tool.tool_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className={styled['staff-card-desc']}>{item.desc}</p>
              <div className={styled['staff-card-area']}>
                <div className={cn(styled['staff-area-hd'], 'flex items-center gap-0.5')}>
                  <img src={AreaSvg} alt="" />
                  <span>{t('home.core_capability')}</span>
                </div>
                <ul>
                  {item.desc_items.map((str: string) => (
                    <li key={str}>{str}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className={styled['staff-more']}>{t('home.coming_soon')}</p>
    </>
  );
};

export default Footer;
