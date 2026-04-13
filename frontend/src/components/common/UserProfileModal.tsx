import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Avatar, Typography, message, Popconfirm } from 'antd';
import { UserOutlined, PlusOutlined, CheckOutlined, MessageOutlined, StopOutlined, UserAddOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { followUser, unfollowUser } from '../../api/follow';
import { blockUser } from '../../api/block';
import { sendFriendRequest, checkFriendship } from '../../api/friend';
import { useAuthStore } from '../../store/auth';
import { useFollowStore } from '../../store/follow';
import { getAvatarUrl } from '../../utils/images';

const { Text } = Typography;

interface User {
  id: number;
  username: string;
  avatar?: string;
  bio?: string;
}

interface UserProfileModalProps {
  user: User;
  visible: boolean;
  onClose: () => void;
  onOpenChat?: () => void;
}

export function UserProfileModal({ user, visible, onClose, onOpenChat }: UserProfileModalProps) {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const currentUser = useAuthStore((s) => s.user);
  const followStatus = useFollowStore((s) => s.followStatus);
  const setFollowStatus = useFollowStore((s) => s.setFollowStatus);
  const checkAndCacheStatus = useFollowStore((s) => s.checkAndCacheStatus);
  const [followLoading, setFollowLoading] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  const isFollowing = followStatus[user.id] ?? false;

  useEffect(() => {
    if (visible && isLoggedIn) {
      void checkAndCacheStatus(user.id);
      void checkFriendshipStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isLoggedIn, user.id, checkAndCacheStatus]);

  const checkFriendshipStatus = async () => {
    try {
      const res = await checkFriendship(user.id);
      setIsFriend(!!res?.isFriend);
    } catch {
      setIsFriend(false);
    }
    setHasPendingRequest(false);
  };

  const handleFollow = async () => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(user.id);
        setFollowStatus(user.id, false);
        void message.success('已取消关注');
      } else {
        await followUser(user.id);
        setFollowStatus(user.id, true);
        void message.success('关注成功');
      }
    } catch (error: any) {
      void checkAndCacheStatus(user.id);
      const errorMessage = error?.response?.data?.error || error?.message || '操作失败';
      void message.error(errorMessage);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }
    setFriendLoading(true);
    try {
      await sendFriendRequest(user.id);
      void message.success('好友请求已发送');
      setHasPendingRequest(true);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || '发送失败';
      void message.error(errorMessage);
    } finally {
      setFriendLoading(false);
    }
  };

  const handleMessage = () => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }
    onClose();
    onOpenChat?.();
  };

  const handleBlock = async () => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }
    try {
      await blockUser(user.id);
      void message.success('已拉黑该用户');
      onClose();
    } catch {
      void message.error('操作失败');
    }
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <Card
        style={{
          width: 420,
          borderRadius: 20,
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
        bodyStyle={{ padding: 0 }}
      >
        {/* Header background */}
        <div
          style={{
            height: 120,
            background: 'linear-gradient(135deg, #ff6b35 0%, #ff8e53 50%, #ffb347 100%)',
            position: 'relative',
          }}
        >
          <Button
            type="text"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: '#fff',
              fontSize: 18,
              zIndex: 1,
            }}
          >
            ✕
          </Button>
        </div>

        {/* User info */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 20,
            marginTop: -50,
            position: 'relative',
            zIndex: 2,
            padding: '0 16px',
          }}
        >
          <Avatar
            src={getAvatarUrl(user)}
            icon={<UserOutlined />}
            size={90}
            style={{
              marginBottom: 12,
              border: '4px solid #fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          />
          <Typography.Title level={4} style={{ margin: '0 0 4px 0', fontSize: 20, lineHeight: 1.3 }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #ff6b35 0%, #ff8e53 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {user.username}
            </span>
          </Typography.Title>
          <Text
            type="secondary"
            style={{
              fontSize: 13,
              display: 'block',
              maxWidth: 320,
              margin: '0 auto 12px',
              lineHeight: 1.4,
            }}
            ellipsis={{ tooltip: user.bio }}
          >
            {user.bio || '这个人很懒，什么都没写 ✨'}
          </Text>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {isLoggedIn && user.id !== currentUser?.id && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {/* 好友按钮 */}
              <div style={{ display: 'flex', gap: 10 }}>
                {isFriend ? (
                  <Button
                    size="large"
                    icon={<CheckOutlined />}
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 12,
                      fontWeight: 500,
                      background: '#f6ffed',
                      borderColor: '#b7eb8f',
                      color: '#52c41a',
                    }}
                  >
                    已是好友
                  </Button>
                ) : hasPendingRequest ? (
                  <Button
                    size="large"
                    icon={<ClockCircleOutlined />}
                    disabled
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 12,
                      fontWeight: 500,
                    }}
                  >
                    等待确认
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    size="large"
                    icon={<UserAddOutlined />}
                    onClick={handleAddFriend}
                    loading={friendLoading}
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 12,
                      fontWeight: 500,
                      background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)',
                    }}
                  >
                    添加好友
                  </Button>
                )}
                <Button
                  size="large"
                  icon={<MessageOutlined />}
                  onClick={handleMessage}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 12,
                    fontWeight: 500,
                  }}
                >
                  私信
                </Button>
              </div>
              {/* 关注按钮 */}
              <div style={{ display: 'flex', gap: 10 }}>
                <Button
                  type={isFollowing ? 'default' : 'primary'}
                  size="large"
                  icon={isFollowing ? <CheckOutlined /> : <PlusOutlined />}
                  onClick={handleFollow}
                  loading={followLoading}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 12,
                    fontWeight: 500,
                    background: isFollowing ? undefined : 'linear-gradient(135deg, #ff6b35 0%, #ff8e53 100%)',
                    border: isFollowing ? undefined : 'none',
                    boxShadow: isFollowing ? 'none' : '0 4px 12px rgba(255, 107, 53, 0.3)',
                  }}
                >
                  {isFollowing ? '已关注' : '关注'}
                </Button>
                <Popconfirm
                  title="确定要拉黑该用户吗？"
                  description="拉黑后该用户无法给你发送私信"
                  onConfirm={handleBlock}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    danger
                    size="large"
                    icon={<StopOutlined />}
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 12,
                    }}
                  >
                    拉黑
                  </Button>
                </Popconfirm>
              </div>
            </div>
          )}

          <Button
            type="primary"
            size="large"
            onClick={() => {
              onClose();
              navigate(`/profile?userId=${user.id}`);
            }}
            block
            style={{
              height: 42,
              borderRadius: 12,
              fontWeight: 500,
              background: 'linear-gradient(135deg, #ff6b35 0%, #ffb347 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
            }}
          >
            查看完整主页
          </Button>
        </div>
      </Card>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default UserProfileModal;