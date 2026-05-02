import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getAvatarUrl } from '../../utils/images';

interface Props {
  user: {
    id: number;
    username: string;
    avatar?: string | null;
    avatarData?: string | null;
    level?: { level: number; name: string; icon?: string } | null;
  };
  size?: number | 'small' | 'large' | number;
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#8c8c8c',
  2: '#52c41a',
  3: '#1890ff',
  4: '#722ed1',
  5: '#fa8c16',
  6: '#f5222d',
};

const LEVEL_ICONS: Record<number, string> = {
  1: '🌱',
  2: '🍀',
  3: '🌸',
  4: '⭐',
  5: '🔥',
  6: '👑',
};

const getLevelColor = (level: number) => LEVEL_COLORS[level] ?? '#8c8c8c';
const getLevelIcon = (level: number) => LEVEL_ICONS[level] ?? '🌱';

export default function UserAvatar({ user, size = 36, onClick, className }: Props) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'visible',
      }}
    >
      <div style={{ position: 'relative', borderRadius: '50%', overflow: 'visible' }}>
        <Avatar
          src={getAvatarUrl(user)}
          icon={<UserOutlined />}
          size={size}
          onClick={onClick}
          className={className}
          style={onClick ? { cursor: 'pointer' } : undefined}
        />
        {/* 等级徽章 - 显示在头像底部，与头像融为一体 */}
        {user.level && (
          <div
            style={{
              position: 'absolute',
              bottom: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              padding: '2px 6px',
              minWidth: 24,
              height: 18,
              borderRadius: 9,
              fontSize: 11,
              fontWeight: 700,
              background: getLevelColor(user.level.level),
              border: '2px solid #fff',
              color: '#fff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              whiteSpace: 'nowrap',
              lineHeight: 1,
              zIndex: 10,
            }}
          >
            {getLevelIcon(user.level.level)}{user.level.level}
          </div>
        )}
      </div>
    </div>
  );
}
