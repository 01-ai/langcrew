import React, { useMemo } from 'react';
import { Dropdown } from 'antd';
import { CheckOutlined, DownOutlined } from '@ant-design/icons';
import { SearchIcon } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface DeepResearchFooterProps {
  mode: 'google_api' | 'self_configured';
  source: string;
  onSetMode: (mode: 'google_api' | 'self_configured') => void;
  onSetSource: (source: string) => void;
}

const DeepResearchFooter: React.FC<DeepResearchFooterProps> = ({ mode, source, onSetMode, onSetSource }) => {
  const { t } = useTranslation();
  const content = useMemo(() => {
    const createSourceIcon = (letter: string) => (
      <div className="w-4 h-4 flex items-center justify-center bg-[#e6f3ff] rounded-[2px] text-[#0285ff] font-bold text-[10px]">
        {letter}
      </div>
    );

    const sources = [
      { key: 'serp', label: 'Google', icon: createSourceIcon('G') },
      { key: 'bocha', label: 'Bocha', icon: createSourceIcon('B') },
      { key: 'tavily', label: 'Tavily', icon: createSourceIcon('T') },
    ];
    const currentSource = sources.find((item) => item.key === source);

    const menu = {
      items: sources.map((item) => ({
        key: item.key,
        label: (
          <div className="flex items-center justify-between gap-3 min-w-[120px] px-3 py-2">
            <div className="flex items-center gap-2">
              {item.icon}
              <span className="text-sm text-gray-800">{item.label}</span>
            </div>
            {source === item.key && <CheckOutlined className="text-[#0285ff] text-xs" />}
          </div>
        ),
        onClick: () => onSetSource(item.key),
      })),
    };

    const buttonBaseClass =
      'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border rounded-2xl';
    const activeClass = 'bg-white text-[#0285ff] border-[#0285ff]';
    const inactiveClass = 'bg-white text-gray-700 border-gray-200 hover:border-[#0285ff] hover:text-[#0285ff]';

    return (
      <div className="flex items-stretch w-full gap-5">
        <Dropdown menu={menu} trigger={['hover']} placement="top">
          <button
            type="button"
            className={`${buttonBaseClass} ${mode === 'self_configured' ? activeClass : inactiveClass}`}
            onClick={() => onSetMode('self_configured')}
          >
            {currentSource?.icon}
            <span>{t('deepresearch.mode.self_configured')}</span>
            <DownOutlined className="text-[10px] transition-transform" />
          </button>
        </Dropdown>
        <button
          type="button"
          className={`${buttonBaseClass} ${mode === 'google_api' ? activeClass : inactiveClass}`}
          onClick={() => onSetMode('google_api')}
        >
          <SearchIcon className="w-4 h-4" />
          <span>{t('deepresearch.mode.google_api')}</span>
        </button>
      </div>
    );
  }, [mode, source, onSetMode, onSetSource, t]);

  return content;
};

export default DeepResearchFooter;
