import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Popover } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { ChevronRight, Puzzle, Search } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAgentStore } from '@/store';
import type { AgentTool, Mention } from '@/types';
import { buildMentionToken } from '@/utils/mentions';
import { getToolName } from '../utils/toolName';

interface SenderMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

const SKILLS_KEY = 'skills';
const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape']);

type FocusPane = 'primary' | 'skills';

const isToolUnavailable = (tool: AgentTool) => ['COMING', 'INACTIVE'].includes(tool.status || '');

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
  return target.isContentEditable;
};

const ToolAvatar: React.FC<{ tool: AgentTool }> = ({ tool }) => {
  if (tool.icon) {
    return <img src={tool.icon} alt="" width={20} height={20} />;
  }
  return <Puzzle size={20} strokeWidth={1.75} />;
};

interface ToolMenuPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  menuItems: SenderMenuItem[];
  selectedScene: string | null;
  onSelectScene: (key: string) => void;
  tools: AgentTool[];
  query?: string;
  onPickMention?: (mention: Mention) => void;
  onRemoveMention?: (mention: Mention) => void;
  onManageSkills?: () => void;
  toolReadonly?: boolean;
  children: React.ReactNode;
}

const ToolMenuPopover: React.FC<ToolMenuPopoverProps> = ({
  open,
  onOpenChange,
  disabled,
  menuItems,
  selectedScene,
  onSelectScene,
  tools,
  query,
  onPickMention,
  onRemoveMention,
  onManageSkills,
  toolReadonly,
  children,
}) => {
  const { t } = useTranslation();
  const [focusPane, setFocusPane] = useState<FocusPane>('primary');
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [skillIndex, setSkillIndex] = useState(0);
  const [skillSearch, setSkillSearch] = useState('');
  const { senderMentions } = useAgentStore();

  const showSkills = tools.length > 0;

  const primaryItems = useMemo(
    () => [
      ...menuItems.map((item) => ({ ...item, itemType: 'scene' as const })),
      ...(showSkills
        ? [{ key: SKILLS_KEY, label: t('tool.tab.skills'), icon: undefined, itemType: 'skills' as const }]
        : []),
    ],
    [menuItems, showSkills, t],
  );

  const sceneKeys = useMemo(() => new Set(menuItems.map((item) => item.key)), [menuItems]);
  const selectedIds = useMemo(
    () =>
      new Set(
        senderMentions
          .filter((item) => item.type === 'tool' && !sceneKeys.has(item.id))
          .map((item) => item.id),
      ),
    [sceneKeys, senderMentions],
  );

  const filteredTools = useMemo(() => {
    const keyword = skillSearch.trim().toLowerCase();
    if (!keyword) return tools;
    return tools.filter((item) => {
      const name = getToolName(item).toLowerCase();
      const desc = `${item.brief_introduction || ''} ${(item as AgentTool & { desc?: string }).desc || ''}`.toLowerCase();
      return name.includes(keyword) || desc.includes(keyword) || item.agent_tool_id.toLowerCase().includes(keyword);
    });
  }, [skillSearch, tools]);

  const focusedPrimary = primaryItems[primaryIndex];
  const showSkillsPanel = showSkills && focusedPrimary?.key === SKILLS_KEY;

  const resetFocus = useCallback(
    (nextQuery?: string) => {
      const skillsIndex = primaryItems.findIndex((item) => item.key === SKILLS_KEY);
      const shouldFocusSkills = nextQuery !== undefined && skillsIndex >= 0;
      setSkillSearch(nextQuery ?? '');
      setPrimaryIndex(shouldFocusSkills ? skillsIndex : 0);
      setSkillIndex(0);
      setFocusPane(shouldFocusSkills ? 'skills' : 'primary');
    },
    [primaryItems],
  );

  useEffect(() => {
    if (!open) return;
    resetFocus(query);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- only reset when the menu opens

  useEffect(() => {
    if (!open || query === undefined) return;
    setSkillSearch(query);
    const skillsIndex = primaryItems.findIndex((item) => item.key === SKILLS_KEY);
    if (skillsIndex >= 0) {
      setPrimaryIndex(skillsIndex);
      setFocusPane('skills');
      setSkillIndex(0);
    }
  }, [open, query, primaryItems]);

  useEffect(() => {
    setSkillIndex((index) => {
      if (filteredTools.length === 0) return 0;
      return Math.min(index, filteredTools.length - 1);
    });
  }, [filteredTools.length]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (disabled) return;
      onOpenChange(nextOpen);
      if (!nextOpen) resetFocus();
    },
    [disabled, onOpenChange, resetFocus],
  );

  const closeMenu = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const handleSelectScene = useCallback(
    (item: SenderMenuItem) => {
      onSelectScene(item.key);
      closeMenu();
    },
    [closeMenu, onSelectScene],
  );

  const pickTool = useCallback(
    (tool: AgentTool) => {
      if (toolReadonly || isToolUnavailable(tool)) return;

      const mention: Mention = {
        type: 'tool',
        id: tool.agent_tool_id,
        token: buildMentionToken('tool', tool.agent_tool_id),
        label: getToolName(tool),
      };
      const selected = selectedIds.has(tool.agent_tool_id);
      // @ trigger confirms the mention (and consumes `@query`); button mode toggles.
      if (selected && query === undefined) {
        onRemoveMention?.(mention);
        return;
      }
      onPickMention?.(mention);
    },
    [onPickMention, onRemoveMention, query, selectedIds, toolReadonly],
  );

  const enterSkillsPane = useCallback(() => {
    if (!showSkillsPanel || filteredTools.length === 0) return;
    setFocusPane('skills');
    setSkillIndex((index) => Math.min(index, filteredTools.length - 1));
  }, [filteredTools.length, showSkillsPanel]);

  const confirmFocused = useCallback(() => {
    if (focusPane === 'skills') {
      const tool = filteredTools[skillIndex];
      if (tool) pickTool(tool);
      return;
    }

    if (focusedPrimary?.itemType === 'skills') {
      enterSkillsPane();
      return;
    }

    if (focusedPrimary && focusedPrimary.itemType === 'scene') {
      handleSelectScene(focusedPrimary);
    }
  }, [enterSkillsPane, filteredTools, focusPane, focusedPrimary, handleSelectScene, pickTool, skillIndex]);

  useEffect(() => {
    if (!open || disabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;

      const key = event.key;
      if (!NAV_KEYS.has(key)) return;

      const intercept = () => {
        event.preventDefault();
        event.stopPropagation();
      };

      if (key === 'Escape') {
        intercept();
        closeMenu();
        return;
      }

      if (key === 'Enter') {
        intercept();
        confirmFocused();
        return;
      }

      const editable = isEditableTarget(event.target);

      if (key === 'ArrowLeft') {
        if (editable) return;
        if (focusPane !== 'skills') return;
        intercept();
        setFocusPane('primary');
        return;
      }

      if (key === 'ArrowRight') {
        if (editable) return;
        if (focusPane !== 'primary' || focusedPrimary?.itemType !== 'skills') return;
        intercept();
        enterSkillsPane();
        return;
      }

      intercept();
      const delta = key === 'ArrowDown' ? 1 : -1;
      if (focusPane === 'skills') {
        if (filteredTools.length === 0) return;
        setSkillIndex((index) => (index + delta + filteredTools.length) % filteredTools.length);
        return;
      }
      if (primaryItems.length === 0) return;
      setPrimaryIndex((index) => (index + delta + primaryItems.length) % primaryItems.length);
      setFocusPane('primary');
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [
    closeMenu,
    confirmFocused,
    disabled,
    enterSkillsPane,
    filteredTools.length,
    focusPane,
    focusedPrimary,
    open,
    primaryItems.length,
  ]);

  const content = (
    <div className="agentx-tool-menu-popover">
      <div className="agentx-tool-menu-popover__primary">
        {primaryItems.map((item, index) => {
          const focused = focusPane === 'primary' && index === primaryIndex;
          const submenuOpen = item.itemType === 'skills' && showSkillsPanel;
          return (
            <button
              key={item.key}
              type="button"
              className={`agentx-tool-menu-popover__item${focused || submenuOpen ? ' agentx-tool-menu-popover__item--active' : ''}${
                selectedScene === item.key ? ' agentx-tool-menu-popover__item--selected' : ''
              }`}
              onMouseEnter={() => {
                setPrimaryIndex(index);
                setFocusPane(item.itemType === 'skills' ? 'skills' : 'primary');
              }}
              onClick={() => {
                if (item.itemType === 'skills') {
                  setPrimaryIndex(index);
                  enterSkillsPane();
                  return;
                }
                handleSelectScene(item);
              }}
            >
              <span className="agentx-tool-menu-popover__item-left">
                <span className="agentx-tool-menu-popover__icon">
                  {item.itemType === 'skills' ? <Puzzle size={20} strokeWidth={1.75} /> : item.icon}
                </span>
                <span className="agentx-tool-menu-popover__label">{item.label}</span>
              </span>
              {item.itemType === 'skills' && (
                <span className="agentx-tool-menu-popover__chevron">
                  <ChevronRight size={16} strokeWidth={1.75} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showSkillsPanel && (
        <div className="agentx-tool-submenu">
          <div className="agentx-tool-submenu__search-wrap">
            <div className="agentx-tool-submenu__search">
              <input
                className="agentx-tool-submenu__search-input"
                value={skillSearch}
                onChange={(event) => {
                  setSkillSearch(event.target.value);
                  setSkillIndex(0);
                  setFocusPane('skills');
                }}
                placeholder={t('sender.tool_menu.search')}
              />
              <span className="agentx-tool-submenu__search-icon">
                <Search size={16} strokeWidth={1.75} />
              </span>
            </div>
          </div>

          <div className="agentx-tool-submenu__list">
            {filteredTools.map((tool, index) => {
              const selected = selectedIds.has(tool.agent_tool_id);
              const focused = focusPane === 'skills' && index === skillIndex;
              const unavailable = isToolUnavailable(tool);
              const disabled = unavailable || !!toolReadonly;
              return (
                <button
                  key={tool.agent_tool_id}
                  type="button"
                  disabled={disabled}
                  className={`agentx-tool-submenu__item${focused ? ' agentx-tool-submenu__item--active' : ''}${
                    disabled ? ' agentx-tool-submenu__item--disabled' : ''
                  }`}
                  ref={(node) => {
                    if (focused) node?.scrollIntoView({ block: 'nearest' });
                  }}
                  onMouseEnter={() => {
                    setSkillIndex(index);
                    setFocusPane('skills');
                  }}
                  onClick={() => pickTool(tool)}
                >
                  <span className="agentx-tool-submenu__item-left">
                    <span className="agentx-tool-menu-popover__icon">
                      <ToolAvatar tool={tool} />
                    </span>
                    <span className="agentx-tool-menu-popover__label">{getToolName(tool)}</span>
                  </span>
                  {tool.status === 'COMING' ? (
                    <span className="agentx-tool-submenu__status">{t('mcp.tool.coming')}</span>
                  ) : (
                    selected && (
                      <span className="agentx-tool-submenu__check">
                        <CheckCircleFilled />
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </div>

          <div className="agentx-tool-submenu__footer">
            <span className="agentx-tool-submenu__count">
              {t('sender.tool_menu.selected_count', { count: selectedIds.size })}
            </span>
            {onManageSkills && (
              <button
                type="button"
                className="agentx-tool-submenu__manage"
                onClick={() => {
                  closeMenu();
                  onManageSkills();
                }}
              >
                {t('sender.tool_menu.manage_skills')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      autoAdjustOverflow={false}
      overlayClassName="agentx-tool-menu-popover-overlay"
      content={content}
    >
      {children}
    </Popover>
  );
};

export default ToolMenuPopover;
