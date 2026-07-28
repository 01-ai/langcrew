import React, { useMemo } from 'react';
import { Dropdown } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import type { ModelItem } from '@/types';
import { getLanguage, useTranslation } from '@/hooks/useTranslation';
import downArrowImg from '@/assets/svg/sender/down-arrow.svg';
import selectedImg from '@/assets/svg/sender/selected.svg';

const isImageUrl = (url?: string) => url?.startsWith('http') || url?.startsWith('data:');
const DEFAULT_MENU_WIDTH = 268;
const MAX_MENU_WIDTH = 520;

const measureTextWidth = (text: string, font: string) => {
  // In SSR / tests, document may be unavailable.
  if (typeof document === 'undefined') return text.length * 8;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * 8;
  ctx.font = font;
  return ctx.measureText(text).width;
};

const truncateToWidth = (text: string, maxWidthPx: number, font: string) => {
  if (!text) return '';
  if (maxWidthPx <= 0) return '…';
  if (measureTextWidth(text, font) <= maxWidthPx) return text;

  const ellipsis = '…';
  const ellipsisW = measureTextWidth(ellipsis, font);
  const target = Math.max(0, maxWidthPx - ellipsisW);

  // Binary search longest prefix that fits.
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = text.slice(0, mid);
    if (measureTextWidth(candidate, font) <= target) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return `${text.slice(0, lo)}${ellipsis}`;
};

interface ModelSelectorProps {
  models?: ModelItem[];
  selectedModels?: ModelItem[];
  onModelSelect: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
}

const getFeatureText = (model?: ModelItem) => {
  const lang = getLanguage();
  // It says it's system data.
  if (model?.ext?.feature_en) {
    // Prefer to user-set languages
    if (model?.ext?.[`feature_${lang}`]) {
      return model?.ext?.[`feature_${lang}`];
    }
    // In Chinese, usefeature
    if (lang === 'zh') {
      return model?.ext?.feature;
    }
    // If no user language is available, use English as afallback
    return model?.ext?.feature_en;
  }
  // User created data
  return model?.ext?.feature;
};
const getDescText = (model?: ModelItem) => {
  const lang = getLanguage();
  // It says it's system data.
  if (model?.ext?.desc_en) {
    // Prefer to user-set languages
    if (model?.ext?.[`desc_${lang}`]) {
      return model?.ext?.[`desc_${lang}`];
    }
    // In Chinese, usedesc
    if (lang === 'zh') {
      return model?.ext?.desc;
    }
    // If no user language is available, use English as afallback
    return model?.ext?.desc_en;
  }
  // User created data
  return model?.ext?.desc;
};

const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModels = [],
  onModelSelect,
  disabled = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const currentModel = useMemo(() => selectedModels?.[0], [selectedModels]);
  const currentModelId = currentModel?.id || '';
  const hasSelection = !!currentModel;

  const menuWidth = useMemo(() => {
    if (!models?.length) return DEFAULT_MENU_WIDTH;

    // Match menu title font in Figma (14px, medium)
    const font = `500 14px PingFang SC, PingFangSC-Medium, -apple-system, system-ui, sans-serif`;
    const gap = 4; // from .agentx-model-option__title gap
    const iconW = 16;
    const checkW = 20;
    const optionPaddingX = 16; // 8 left + 8 right
    const menuPaddingAndBorder = 12; // menu padding/border safety
    const scrollbarSafety = 12;

    let max = DEFAULT_MENU_WIDTH;

    for (const m of models) {
      const featureText = getFeatureText(m);
      const featureDisplayText = featureText;
      const titleText = `${featureDisplayText ? `${featureDisplayText}·` : ''}${m.model_display_name || ''}`;
      const textW = measureTextWidth(titleText, font);

      // Children: [feature?] [icon] [name]
      const gapCount = featureDisplayText ? 2 : 1;
      const titleRowW = textW + iconW + gapCount * gap;
      const optionMinW = optionPaddingX + titleRowW + checkW + menuPaddingAndBorder + scrollbarSafety;

      max = Math.max(max, Math.ceil(optionMinW));
    }

    // Avoid going beyond viewport
    const viewportMax =
      typeof window !== 'undefined' ? Math.max(DEFAULT_MENU_WIDTH, window.innerWidth - 40) : MAX_MENU_WIDTH;
    return Math.min(max, MAX_MENU_WIDTH, viewportMax);
  }, [models]);

  // --- 1. Build the Dropdown Menu Item (Signure) Figma: Frame 1597880231 / node 27101:36176） ---
  const menuItems = useMemo(() => {
    if (!models || models.length === 0) return [];

    // Match menu desc font in Figma (12px, regular, #999)
    const descFont = `400 12px PingFang SC, PingFangSC-Regular, -apple-system, system-ui, sans-serif`;
    // Available width for description line: menu width minus option padding and check icon.
    // (The description does not include the left 16px avatar, but shares the same text container
    // which is laid out with space reserved for the checkmark on the right.)
    const optionPaddingX = 16; // 8 left + 8 right
    const checkW = 20;
    const safety = 12; // extra buffer for scrollbar/rounding
    const descMaxWidthPx = Math.max(80, menuWidth - optionPaddingX - checkW - safety);

    const itemRender = (item: any) => {
      const isSelected = item.id === currentModelId;
      const featureText = getFeatureText(item);
      const featureDisplayText = featureText;
      const descText = getDescText(item);
      // The text is cut by the width of the menu.hover It's possible. title View full content)(Discarded, changed.cssAchievedline-clamp)
      // const descDisplayText = descText ? truncateToWidth(descText, descMaxWidthPx, descFont) : '';
      const descDisplayText = descText;
      return {
        key: item.id,
        label: (
          <div className={`agentx-model-option ${isSelected ? 'is-selected' : ''}`} style={{ width: menuWidth - 16 }}>
            <div className="agentx-model-option__text">
              <div className="agentx-model-option__title">
                {!!featureDisplayText && (
                  <span className="agentx-model-option__feature" title={featureText}>
                    {featureDisplayText}
                  </span>
                )}
                {isImageUrl(item.icon) ? (
                  <img src={item.icon} alt="model icon" className="agentx-model-option__icon" />
                ) : (
                  <span className="agentx-model-option__icon agentx-model-option__icon--text">{item.icon || ''}</span>
                )}
                <span className="agentx-model-option__name" title={item.model_display_name}>
                  {item.model_display_name}
                </span>
              </div>
              {!!descDisplayText && (
                <div className="agentx-model-option__desc" title={descText}>
                  {descDisplayText}
                </div>
              )}
            </div>
            {isSelected && (
              <div className="agentx-model-option__check" aria-label="selected">
                <img src={selectedImg} alt="selected" />
              </div>
            )}
          </div>
        ),
      };
    };

    const groups: any[] = [
      {
        key: 'official',
        type: 'group',
        label: t('models.official'),
        children: models
          .filter((item: any) => !item?.is_owner)
          .map(itemRender),
      },
    ];

    const myModels = models.filter((item: any) => item?.is_owner);

    if (myModels.length > 0) {
      groups.push({
        key: 'my',
        type: 'group',
        label: t('models.my'),
        children: myModels.map(itemRender),
      });
    }

    return groups;
  }, [models, t, currentModelId, menuWidth]);

  // --- 2. Build the trigger button. ---
  const renderTrigger = () => {
    const baseClasses = `agentx-model-trigger ${disabled ? 'is-disabled' : ''} ${className}`;

    // --- Status A：Selected (A capsule with color. + Clear button) ---
    if (hasSelection) {
      return (
        <div className={baseClasses}>
          <div className="agentx-model-trigger__content">
            {isImageUrl(currentModel.icon) ? (
              <img src={currentModel.icon} alt="model icon" className="agentx-model-trigger__icon" />
            ) : (
              <span className="agentx-model-trigger__icon agentx-model-trigger__icon--text">
                {currentModel.icon || '🧠'}
              </span>
            )}
            <span className="agentx-model-trigger__name">{currentModel.model_display_name}</span>
          </div>
          <img src={downArrowImg} alt="checked" className="agentx-model-trigger__caret" />
        </div>
      );
    }

    // --- Status B：Not Selected (Circle button, consistent with left tool assembly) ---
    return (
      <div className={`${baseClasses} is-empty`}>
        <span className="agentx-model-trigger__empty-icon">🧠</span>
      </div>
    );
  };

  if (!models || models.length === 0) return null;

  return (
    <Dropdown
      menu={{
        items: menuItems,
        onClick: ({ key }) => {
          onModelSelect(key as string);
        },
        className: 'agentx-model-menu',
      }}
      trigger={['click']}
      placement="bottomLeft"
      disabled={disabled}
      // overlayStyle={{ width: menuWidth }}
      arrow={false}
      styles={{
        item: {
          width: menuWidth - 16
        }
      }}
    >
      {renderTrigger()}
    </Dropdown>
  );
};

export default ModelSelector;
