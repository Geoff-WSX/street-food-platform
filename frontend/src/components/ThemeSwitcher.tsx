import React, { useState } from 'react';
import { Button, Tooltip, theme } from 'antd';
import {
  SunOutlined,
  MoonOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useThemeStore, themeUtils } from '../store/theme';

interface ThemeSwitcherProps {
  style?: React.CSSProperties;
  className?: string;
  showLabel?: boolean;
  size?: 'small' | 'middle' | 'large';
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  style,
  className,
  showLabel = false,
  size = 'middle',
}) => {
  const { mode } = useThemeStore();
  const [isAnimating, setIsAnimating] = useState(false);
  const { token } = theme.useToken();

  const handleToggle = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    themeUtils.toggleWithAnimation();

    setTimeout(() => {
      setIsAnimating(false);
    }, 350);
  };

  const getIcon = () => {
    if (isAnimating) {
      return <ThunderboltOutlined spin />;
    }
    return mode === 'light' ? <MoonOutlined /> : <SunOutlined />;
  };

  const getTitle = () => {
    return mode === 'light' ? '切换夜间模式' : '切换日间模式';
  };

  if (showLabel) {
    return (
      <Button
        size={size}
        icon={getIcon()}
        onClick={handleToggle}
        style={{
          borderRadius: token.borderRadius,
          border: `1px solid var(--border-color-secondary)`,
          background: 'var(--card-bg)',
          color: 'var(--text-primary)',
          ...style,
        }}
        className={className}
      >
        {mode === 'light' ? '日间模式' : '夜间模式'}
      </Button>
    );
  }

  return (
    <Tooltip title={getTitle()}>
      <Button
        icon={getIcon()}
        size={size}
        onClick={handleToggle}
        style={{
          borderRadius: '50%',
          width: size === 'small' ? 36 : size === 'large' ? 52 : 44,
          height: size === 'small' ? 36 : size === 'large' ? 52 : 44,
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          border: '1px solid var(--border-color-secondary)',
          background: 'var(--card-bg)',
          color: 'var(--text-primary)',
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
        className={className}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-primary)';
          e.currentTarget.style.color = 'var(--color-primary)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color-secondary)';
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {/* 背景光效 */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100%',
            height: '100%',
            background: mode === 'light'
              ? 'radial-gradient(circle, rgba(255, 193, 7, 0.1) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(144, 202, 249, 0.1) 0%, transparent 70%)',
            transform: 'translate(-50%, -50%)',
            transition: 'opacity 0.3s ease',
            opacity: 0,
            pointerEvents: 'none',
          }}
          className="theme-button-glow"
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0';
          }}
        />
      </Button>
    </Tooltip>
  );
};

export default ThemeSwitcher;
