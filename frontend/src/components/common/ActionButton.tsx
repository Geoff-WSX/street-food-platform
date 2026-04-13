import React from 'react';
import { HeartOutlined, HeartFilled, StarOutlined, StarFilled, CommentOutlined, ShareAltOutlined } from '@ant-design/icons';

interface ActionButtonProps {
  type: 'like' | 'favorite' | 'comment' | 'share';
  active?: boolean;
  count?: number;
  onClick?: (e: React.MouseEvent) => void;
  loading?: boolean;
  size?: 'small' | 'default';
}

const icons = {
  like: {
    active: <HeartFilled />,
    inactive: <HeartOutlined />,
  },
  favorite: {
    active: <StarFilled />,
    inactive: <StarOutlined />,
  },
  comment: {
    active: <CommentOutlined />,
    inactive: <CommentOutlined />,
  },
  share: {
    active: <ShareAltOutlined />,
    inactive: <ShareAltOutlined />,
  },
};

const labels: Record<string, string> = {
  like: '赞',
  favorite: '藏',
  comment: '评',
  share: '分享',
};

const activeColors: Record<string, string> = {
  like: '#ff4d4f',
  favorite: '#faad14',
  comment: '#8c8c8c',
  share: '#8c8c8c',
};

const activeBgColors: Record<string, string> = {
  like: 'rgba(255, 77, 79, 0.15)',
  favorite: 'rgba(250, 173, 20, 0.15)',
  comment: 'transparent',
  share: 'transparent',
};

export function ActionButton({
  type,
  active = false,
  count = 0,
  onClick,
  loading = false,
  size = 'default',
}: ActionButtonProps) {
  const fontSize = size === 'small' ? 12 : 14;
  const iconSize = size === 'small' ? 12 : 14;
  const padding = size === 'small' ? '3px 6px' : '6px 8px';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        cursor: 'pointer',
        padding,
        borderRadius: 8,
        transition: 'all 0.3s ease',
        background: active ? activeBgColors[type] : 'transparent',
        color: active ? activeColors[type] : '#8c8c8c',
        minWidth: 0,
        opacity: loading ? 0.6 : 1,
        pointerEvents: loading ? 'none' : 'auto',
      }}
    >
      <span style={{ fontSize: iconSize, display: 'flex', alignItems: 'center' }}>
        {active ? icons[type].active : icons[type].inactive}
      </span>
      <span
        style={{
          fontSize,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {count > 0 ? count : labels[type]}
      </span>
    </div>
  );
}

// Action buttons container
interface ActionButtonsProps {
  children: React.ReactNode;
}

export function ActionButtons({ children }: ActionButtonsProps) {
  return (
    <div
      className="food-card-actions"
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        gap: 3,
        padding: '6px 6px',
        background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
        borderRadius: 10,
        overflow: 'hidden',
        height: '36px',
      }}
    >
      {children}
    </div>
  );
}

export default ActionButton;