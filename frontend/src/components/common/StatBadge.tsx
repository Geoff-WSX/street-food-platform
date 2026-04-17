import { Typography, Space } from 'antd';
import { FileTextOutlined, TeamOutlined, UserOutlined, StarOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

const { Text } = Typography;

interface StatBadgeProps {
  type: 'posts' | 'following' | 'followers' | 'favorites' | 'friends' | 'recommended';
  count: number;
  onClick?: () => void;
  icon?: ReactNode;
}

const typeConfig = {
  posts: {
    icon: <FileTextOutlined style={{ fontSize: 12 }} />,
    color: '#1890ff',
    label: '动态'
  },
  following: {
    icon: <TeamOutlined style={{ fontSize: 12 }} />,
    color: '#52c41a',
    label: '关注'
  },
  followers: {
    icon: <UserOutlined style={{ fontSize: 12 }} />,
    color: '#faad14',
    label: '粉丝'
  },
  friends: {
    icon: <UsergroupAddOutlined style={{ fontSize: 12 }} />,
    color: '#13c2c2',
    label: '好友'
  },
  favorites: {
    icon: <StarOutlined style={{ fontSize: 12 }} />,
    color: '#722ed1',
    label: '收藏'
  },
  recommended: {
    icon: <StarOutlined style={{ fontSize: 12 }} />,
    color: '#ff6b35',
    label: '推荐'
  }
};

export function StatBadge({ type, count, onClick }: StatBadgeProps) {
  const config = typeConfig[type];

  return (
    <div
      className={`food-stat-badge ${type}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Space size={4}>
        {config.icon}
        <Text style={{ fontSize: 12, color: config.color }}>
          {config.label}
        </Text>
        <Text strong style={{ fontSize: 14, color: config.color }}>
          {count}
        </Text>
      </Space>
    </div>
  );
}