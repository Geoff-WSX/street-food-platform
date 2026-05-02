import { memo } from 'react';
import { Progress, Tooltip } from 'antd';
import type { Level } from '../api/level';

// 等级颜色映射
const LEVEL_COLORS: Record<number, string> = {
  1: '#8c8c8c', // 灰色
  2: '#52c41a', // 绿色
  3: '#1890ff', // 蓝色
  4: '#722ed1', // 紫色
  5: '#fa8c16', // 橙色
  6: '#f5222d', // 红色
};

// 等级图标映射
const LEVEL_ICONS: Record<number, string> = {
  1: '🌱',
  2: '🍀',
  3: '🌸',
  4: '⭐',
  5: '🔥',
  6: '👑',
};

interface LevelBadgeProps {
  level: Level;
  exp: number;
  expToNextLevel: number | null;
  showProgress?: boolean;
  size?: 'small' | 'default';
}

export const LevelBadge = memo<LevelBadgeProps>(({ level, exp, expToNextLevel, showProgress = false, size = 'default' }) => {
  // 防御性检查：确保 level 存在且 level.level 有值
  if (!level || level.level === undefined || level.level === null) {
    return null;
  }

  const levelColor = LEVEL_COLORS[level.level] ?? '#8c8c8c';
  const levelIcon = LEVEL_ICONS[level.level] ?? '🌱';

  // 计算进度百分比
  const progressPercent = expToNextLevel !== null && expToNextLevel > 0
    ? Math.min(Math.round(((exp - level.minExp) / expToNextLevel) * 100), 100)
    : 100;

  const isSmall = size === 'small';

  const badgeContent = (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? 4 : 6,
        padding: isSmall ? '2px 8px' : '4px 12px',
        borderRadius: 14,
        background: `linear-gradient(135deg, ${levelColor}15 0%, ${levelColor}08 100%)`,
        border: `1px solid ${levelColor}30`,
        cursor: 'default',
        fontSize: isSmall ? 11 : 13,
      }}
    >
      <span style={{ fontSize: isSmall ? 12 : 16 }}>{levelIcon}</span>
      <span style={{ color: levelColor, fontWeight: 600 }}>
        Lv{level.level}
      </span>
      <span style={{ color: levelColor, opacity: 0.8, fontWeight: 400 }}>
        {level.name}
      </span>
      {showProgress && expToNextLevel !== null && (
        <>
          <span style={{ color: levelColor, opacity: 0.6, margin: '0 2px' }}>|</span>
          <span style={{ color: levelColor, opacity: 0.8, fontSize: isSmall ? 10 : 12 }}>
            {exp - level.minExp}/{expToNextLevel}
          </span>
        </>
      )}
    </div>
  );

  // 如果没有进度要显示，直接返回徽章
  if (!showProgress || expToNextLevel === null) {
    return (
      <Tooltip title={`${levelIcon} ${level.name} - ${exp} 经验值`}>
        {badgeContent}
      </Tooltip>
    );
  }

  // 显示进度条
  return (
    <Tooltip
      overlayClassName="level-tooltip"
      overlayInnerStyle={{
        background: 'transparent',
        padding: 0,
      }}
      title={
        <div
          style={{
            background: 'var(--tooltip-bg, #ffffff)',
            color: 'var(--tooltip-color, #1a1a1a)',
            borderRadius: 10,
            padding: '14px 16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            minWidth: 130,
            textAlign: 'center',
          }}
        >
          <div style={{
            fontWeight: 700,
            fontSize: 15,
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}>
            <span style={{ fontSize: 18 }}>{levelIcon}</span>
            <span>{level.name}</span>
          </div>
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            经验值: <span style={{ fontWeight: 600 }}>{exp}</span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
            升级还需: {expToNextLevel} 经验
          </div>
          <Progress
            percent={progressPercent}
            size="small"
            strokeColor={levelColor}
            showInfo={false}
          />
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 6 }}>
            {exp - level.minExp} / {expToNextLevel} 进度
          </div>
        </div>
      }
    >
      {badgeContent}
    </Tooltip>
  );
});

LevelBadge.displayName = 'LevelBadge';

export default LevelBadge;