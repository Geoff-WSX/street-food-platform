import { useState, useEffect, useMemo } from 'react';
import { Card, Space, Button, Avatar, Typography, message, Popconfirm } from 'antd';
import { HeartOutlined, HeartFilled, StarOutlined, StarFilled, EnvironmentOutlined, UserOutlined, PlusOutlined, CheckOutlined, MessageOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { toggleLike, toggleFavorite } from '../api/post';
import { followUser, unfollowUser, checkFollowStatus } from '../api/follow';
import { blockUser } from '../api/block';
import { useAuthStore } from '../store/auth';
import ChatModal from './ChatModal';
import type { Post } from '../types';

const { Text, Paragraph } = Typography;

interface Props {
  post: Post;
  onUpdate?: (updated: Partial<Post> & { id: number }) => void;
  showRank?: boolean;
  rank?: number;
}

export default function PostCard({ post, onUpdate, showRank, rank }: Props) {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  // 处理 images 格式：确保是数组
  const processedImages = useMemo(() => {
    if (!post.images) return [];
    if (Array.isArray(post.images)) return post.images;
    if (typeof post.images === 'string') {
      return post.images.split(',').filter(Boolean);
    }
    return [];
  }, [post.images]);

  const liked = post.isLiked ?? false;
  const favorited = post.isFavorited ?? false;

  const likeCount = typeof post.likeCount === 'number' ? post.likeCount :
                    typeof post.likeCount === 'string' ? parseInt(post.likeCount, 10) || 0 : 0;
  const favoriteCount = typeof post.favoriteCount === 'number' ? post.favoriteCount :
                        typeof post.favoriteCount === 'string' ? parseInt(post.favoriteCount, 10) || 0 : 0;

  const checkFollow = async () => {
    if (isLoggedIn && post.user.id) {
      try {
        const result = await checkFollowStatus(post.user.id);
        setIsFollowing(result.isFollowing);
      } catch {
      // 忽略错误
    }
    }
  };

  useEffect(() => {
    checkFollow();
  }, []);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      void message.info('请先登录');
      navigate('/login');
      return;
    }
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);
    try {
      const res = await toggleLike(post.id);
      onUpdate?.({ id: post.id, isLiked: res.liked, likeCount: res.likeCount });
    } catch {
      // 忽略错误
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      void message.info('请先登录');
      navigate('/login');
      return;
    }
    try {
      const res = await toggleFavorite(post.id);
      onUpdate?.({ id: post.id, isFavorited: res.favorited, favoriteCount: res.favoriteCount });
    } catch {
      // 忽略错误
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      void message.info('请先登录');
      navigate('/login');
      return;
    }
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(post.user.id);
        setIsFollowing(false);
        void message.success('已取消关注');
      } else {
        await followUser(post.user.id);
        setIsFollowing(true);
        void message.success('关注成功');
      }
    } catch {
      void message.error('操作失败');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUserClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowUserModal(true);
  };

  const formatAddress = (address?: string) => {
    if (!address) return null;
    return address.length > 18 ? address.substring(0, 18) + '...' : address;
  };

  const getRankBadge = () => {
    if (!showRank || rank === undefined) return null;
    if (rank === 0) return { badge: '🥇', bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', shadow: '0 4px 15px rgba(255, 215, 0, 0.4)' };
    if (rank === 1) return { badge: '🥈', bg: 'linear-gradient(135deg, #E8E8E8 0%, #BDBDBD 100%)', shadow: '0 4px 15px rgba(189, 189, 189, 0.4)' };
    if (rank === 2) return { badge: '🥉', bg: 'linear-gradient(135deg, #E6A17D 0%, #CD7F32 100%)', shadow: '0 4px 15px rgba(205, 127, 50, 0.4)' };
    return null;
  };

  const rankStyle = getRankBadge();

  return (
    <>
      <Card
        hoverable
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: isHovered ? '0 8px 25px rgba(0,0,0,0.12)' : '0 2px 12px rgba(0,0,0,0.08)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: isHovered ? '1px solid rgba(102, 126, 234, 0.3)' : '1px solid #f0f0f0',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        }}
        bodyStyle={{
          padding: 16,
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={() => navigate(`/post/${post.id}`)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 排名徽章 */}
        {rankStyle && (
          <div
            style={{
              position: 'absolute',
              top: -10,
              left: 12,
              zIndex: 10,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: rankStyle.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: rankStyle.shadow,
              fontWeight: 'bold',
              animation: 'pulse 2s infinite'
            }}
          >
            {rankStyle.badge}
          </div>
        )}

        {/* 图片区域 */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            paddingTop: '75%',
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            marginBottom: 16,
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
        >
          {processedImages.length > 0 && !imageError ? (
            <img
              src={processedImages[0]}
              alt="post"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: imageLoaded ? 1 : 0,
                transition: 'all 0.5s ease',
                transform: isHovered ? 'scale(1.05)' : 'scale(1)'
              }}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          ) : (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontSize: 48
            }}>
              🍜
            </div>
          )}

          {/* 多图标记 */}
          {processedImages.length > 1 && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                background: 'rgba(0,0,0,0.65)',
                color: '#fff',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
              {processedImages.length}
            </div>
          )}

          {/* 排名标识（非前三名） */}
          {showRank && rank !== undefined && rank > 2 && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 10,
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%)',
                color: '#fff',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 'bold',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              NO.{rank + 1}
            </div>
          )}

          {/* 悬停遮罩 */}
          {isHovered && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%)',
                opacity: 0,
                transition: 'opacity 0.3s ease',
                animation: 'fadeIn 0.3s forwards'
              }}
            />
          )}
        </div>

        {/* 内容区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{
              marginBottom: 12,
              fontSize: 15,
              lineHeight: '1.6',
              minHeight: 48,
              maxHeight: 48,
              overflow: 'hidden',
              color: '#262626',
              fontWeight: 400
            }}
          >
            {post.content}
          </Paragraph>

          {/* 地址 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 12,
            fontSize: 13,
            color: '#8c8c8c',
            minHeight: 24,
            maxHeight: 24,
            overflow: 'hidden',
            padding: '6px 10px',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 20%)',
            borderRadius: 8,
            border: '1px solid #e8e8e8'
          }}>
            <EnvironmentOutlined style={{ marginRight: 6, fontSize: 12, flexShrink: 0, color: '#667eea' }} />
            <Text
              type="secondary"
              style={{ fontSize: 13 }}
              ellipsis={{ tooltip: post.address }}
            >
              {post.address ? formatAddress(post.address) : '暂无地址'}
            </Text>
          </div>
        </div>

        {/* 用户信息和互动 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 12,
          borderTop: '1px solid #f0f0f0',
          flexShrink: 0,
          gap: 8
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden'
          }}>
            <Avatar
              src={post.user.avatar}
              icon={<UserOutlined />}
              size={28}
              onClick={handleUserClick}
              style={{
                cursor: 'pointer',
                border: '2px solid #f0f0f0',
                transition: 'all 0.3s ease',
                flexShrink: 0
              }}
            />
            <Text
              style={{
                fontSize: 14,
                cursor: 'pointer',
                maxWidth: 70,
                fontWeight: 500,
                color: '#262626',
                flexShrink: 1
              }}
              ellipsis
              onClick={handleUserClick}
            >
              {post.user.username}
            </Text>
            {isLoggedIn && post.user.id !== useAuthStore.getState().user?.id && (
              <Button
                type={isFollowing ? 'default' : 'primary'}
                size="small"
                icon={isFollowing ? <CheckOutlined /> : <PlusOutlined />}
                onClick={handleFollow}
                loading={followLoading}
                style={{
                  padding: '4px 10px',
                  height: 28,
                  fontSize: 13,
                  borderRadius: 14,
                  minWidth: 60,
                  fontWeight: 500,
                  boxShadow: isFollowing ? 'none' : '0 2px 8px rgba(102, 126, 234, 0.3)',
                  flexShrink: 0
                }}
              >
                {isFollowing ? '已关注' : '关注'}
              </Button>
            )}
          </div>

          <Space size={4} onClick={(e) => e?.stopPropagation()} style={{ flexShrink: 0 }}>
            <Button
              type="text"
              size="small"
              icon={liked ? <HeartFilled /> : <HeartOutlined />}
              onClick={handleLike}
              style={{
                padding: '6px 8px',
                height: 32,
                fontSize: 13,
                borderRadius: 16,
                minWidth: 'auto',
                width: 'auto',
                color: liked ? '#ff4d4f' : '#8c8c8c',
                background: liked ? 'rgba(255, 77, 79, 0.1)' : 'transparent',
                transition: 'all 0.3s ease',
                transform: likeAnimating ? 'scale(1.2)' : 'scale(1)',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>{likeCount > 0 ? likeCount : ''}</span>
            </Button>
            <Button
              type="text"
              size="small"
              icon={favorited ? <StarFilled /> : <StarOutlined />}
              onClick={handleFavorite}
              style={{
                padding: '6px 8px',
                height: 32,
                fontSize: 13,
                borderRadius: 16,
                minWidth: 'auto',
                width: 'auto',
                color: favorited ? '#faad14' : '#8c8c8c',
                background: favorited ? 'rgba(250, 173, 20, 0.1)' : 'transparent',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>{favoriteCount > 0 ? favoriteCount : ''}</span>
            </Button>
          </Space>
        </div>
      </Card>

      {/* 用户信息弹窗 */}
      {showUserModal && (
        <UserModal
          user={post.user}
          visible={showUserModal}
          onClose={() => setShowUserModal(false)}
          onFollowChange={(following) => setIsFollowing(following)}
          onOpenChat={() => setShowChatModal(true)}
        />
      )}

      {/* 私信弹窗 */}
      {showChatModal && (
        <ChatModal
          visible={showChatModal}
          onClose={() => setShowChatModal(false)}
          otherUser={post.user}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}

// 用户信息弹窗组件
function UserModal({ user, visible, onClose, onFollowChange, onOpenChat }: {
  user: { id: number; username: string; avatar?: string; bio?: string };
  visible: boolean;
  onClose: () => void;
  onFollowChange: (following: boolean) => void;
  onOpenChat: () => void;
}) {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const currentUser = useAuthStore((s) => s.user);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (visible && isLoggedIn) {
      checkFollow();
    }
  }, [visible, user.id]);

  const checkFollow = async () => {
    try {
      const result = await checkFollowStatus(user.id);
      setIsFollowing(result.isFollowing);
    } catch {
      // 忽略错误
    }
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
        setIsFollowing(false);
        void message.success('已取消关注');
      } else {
        await followUser(user.id);
        setIsFollowing(true);
        void message.success('关注成功');
      }
      onFollowChange(isFollowing);
    } catch {
      void message.error('操作失败');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = () => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }
    onClose();
    onOpenChat();
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
        animation: 'fadeIn 0.2s ease'
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
          animation: 'slideUp 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部背景 */}
        <div style={{
          height: 120,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative'
        }}>
          <Button
            type="text"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: '#fff',
              fontSize: 18
            }}
          >
            ✕
          </Button>
        </div>

        {/* 用户头像和信息 */}
        <div style={{ textAlign: 'center', marginBottom: 24, marginTop: -50 }}>
          <Avatar
            src={user.avatar}
            icon={<UserOutlined />}
            size={90}
            style={{
              marginBottom: 12,
              border: '4px solid #fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          />
          <Typography.Title level={4} style={{ margin: '0 0 8px 0', fontSize: 20 }}>
            {user.username}
          </Typography.Title>
          <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
            {user.bio || '这个人很懒，什么都没写 ✨'}
          </Text>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {isLoggedIn && user.id !== currentUser?.id && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button
                  type={isFollowing ? 'default' : 'primary'}
                  size="large"
                  icon={isFollowing ? <CheckOutlined /> : <PlusOutlined />}
                  onClick={handleFollow}
                  loading={followLoading}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 12,
                    fontWeight: 500,
                    boxShadow: isFollowing ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  {isFollowing ? '已关注' : '关注'}
                </Button>
                <Button
                  size="large"
                  icon={<MessageOutlined />}
                  onClick={handleMessage}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 12,
                    fontWeight: 500
                  }}
                >
                  私信
                </Button>
              </div>
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
                  block
                  style={{
                    height: 40,
                    borderRadius: 10
                  }}
                >
                  拉黑用户
                </Button>
              </Popconfirm>
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
              height: 44,
              borderRadius: 12,
              fontWeight: 500,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
          >
            查看完整主页
          </Button>
        </div>
      </Card>
    </div>
  );
}

UserModal.defaultProps = {};
