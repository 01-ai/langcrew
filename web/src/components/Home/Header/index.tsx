import React, { FC, useCallback } from 'react';
import { Button } from 'antd';
import ApplySvg from '@/assets/svg/staff/apply-icon.svg?react';
import styled from './styled.module.less';
import { EmployeeType } from '../mock';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface HeaderProps {
  agent?: EmployeeType | null;
}

const Header: FC<HeaderProps> = ({ agent }) => {
  const { t } = useTranslation();
  const onApply = useCallback(() => {}, []);

  return (
    <div className={cn(styled['staff-header'], 'flex justify-between items-end')}>
      <div>
        <h1>{agent?.name || t('home.welcome.title')}</h1>
        <p>{agent?.desc || t('home.welcome.desc')}</p>
      </div>
      <Button className={styled['staff-apply-btn']} icon={<ApplySvg />} onClick={onApply}>
        <span>{t('home.apply')}</span>
      </Button>
    </div>
  );
};

export default Header;
