import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, List, Avatar, Input, Button, Space, Typography, Empty,
  Spin, Popconfirm, message
} from 'antd';
import {
  UserOutlined, SearchOutlined, MessageOutlined, DeleteOutlined,
  UsergroupAddOutlined, CheckOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import { useFriendStore } from '../store/friend';
import ChatModal from '../components/ChatModal';
import { PageLayout } from '../components/layout';
import { getAvatarUrl } from '../utils/images';
import type { User } from '../types';

const { Title, Text } = Typography;

export default function FriendsPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();
  const {
    friends, friendCount, loading, fetchFriends, removeFriend
  } = useFriendStore();

  const [search, setSearch] = useState('');
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    fetchFriends({ pageSize: 100 });
  }, [isLoggedIn, navigate, fetchFriends]);

  const handleSearch = () => {
    fetchFriends({ search: search || undefined, pageSize: 100 });
  };

  const handleRemoveFriend = async (friendId: number) => {
    try {
      await removeFriend(friendId);
      message.success('已删除好友');
    } catch {
      message.error('删除失败');
    }
  };

  const handleOpenChat = (user: User) => {
    setChatUser(user);
    setShowChat(true);
  };

  const renderFriendItem = (friend: any) => {
    const friendUser = friend.user || friend;
    const friendId = friend.userId || friend.id;

    return (
      <List.Item
        key={friendId}
        className="friend-list-item"
        actions={[
          <Button
            key="chat"
            icon={<MessageOutlined />}
            onClick={() => handleOpenChat(friendUser)}
            style={{ borderRadius: 16 }}
          >
            私信
          </Button>,
          <Popconfirm
            key="delete"
            title="确定要删除该好友吗？"
            onConfirm={() => handleRemoveFriend(friendId)}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        ]}
      >
        <List.Item.Meta
          avatar={
            <Avatar
              src={getAvatarUrl(friendUser)}
              icon={<UserOutlined />}
              size={50}
              style={{ cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)' }}
              onClick={() => navigate(`/profile?userId=${friendId}`)}
            />
          }
          title={
            <Text
              strong
              style={{ cursor: 'pointer', fontSize: 15 }}
              onClick={() => navigate(`/profile?userId=${friendId}`)}
            >
              {friendUser.username}
            </Text>
          }
          description={
            <Text type="secondary" style={{ fontSize: 12 }}>
              {friendUser.bio || '这个人很懒，什么都没写'}
            </Text>
          }
        />
      </List.Item>
    );
  };

  if (!isLoggedIn) return null;

  return (
    <PageLayout background="light" className="page-content" maxWidth={800}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>
          <UsergroupAddOutlined /> 我的好友
          <Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>
            ({friendCount} 人)
          </Text>
        </Title>
      </div>

      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="搜索好友..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
        </Space.Compact>
      </Card>

      <Card style={{ borderRadius: 12 }}>
        <Space style={{ marginBottom: 12 }}>
          <Button
            icon={<CheckOutlined />}
            onClick={() => navigate('/friends/requests')}
          >
            好友请求
          </Button>
        </Space>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : friends.length === 0 ? (
          <Empty
            description={
              search ? '没有找到匹配的好友' : '暂无好友，快去添加吧'
            }
            style={{ padding: 40 }}
          >
            {!search && (
              <Button
                type="primary"
                onClick={() => navigate('/')}
              >
                发现好友
              </Button>
            )}
          </Empty>
        ) : (
          <List
            dataSource={friends}
            renderItem={renderFriendItem}
            locale={{ emptyText: '暂无好友' }}
          />
        )}
      </Card>

      {showChat && chatUser && (
        <ChatModal
          visible={showChat}
          onClose={() => setShowChat(false)}
          otherUser={chatUser}
        />
      )}
    </PageLayout>
  );
}