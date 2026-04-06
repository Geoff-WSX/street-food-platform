import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Avatar, Typography, message, Popconfirm } from 'antd';
import { HeartOutlined, HeartFilled, StarOutlined, StarFilled, EnvironmentOutlined, UserOutlined, PlusOutlined, CheckOutlined, MessageOutlined, StopOutlined, CommentOutlined } from '@ant-design/icons';
import { toggleLike, toggleFavorite } from '../api/post';
import { followUser, unfollowUser } from '../api/follow';
import { blockUser } from '../api/block';
import { useAuthStore } from '../store/auth';
import { useFollowStore } from '../store/follow';
import ChatModal from './ChatModal';
import MapModal from './MapModal';
import type { Post } from '../types';
import { getAvatarUrl } from '../utils/images';

const { Text, Paragraph } = Typography;

interface Props {
  post: Post;
  onUpdate?: (updated: Partial<Post> & { id: number }) => void;
  showRank?: boolean;
  rank?: number;
  from?: string; // 来源页面
}

export default function PostCard({ post, onUpdate, showRank, rank, from = '/' }: Props) {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const followStatus = useFollowStore((s) => s.followStatus);
  const setFollowStatus = useFollowStore((s) => s.setFollowStatus);
  const checkAndCacheStatus = useFollowStore((s) => s.checkAndCacheStatus);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Get follow status from global store
  const isFollowing = followStatus[post.user.id] ?? false;

  // 处理 images 格式：确保是数组
  const processedImages = useMemo(() => {
    if (!post.images) return [];
    if (Array.isArray(post.images)) return post.images;
    if (typeof post.images === 'string') {
      try {
        // 尝试解析 JSON 数组字符串
        const parsed = JSON.parse(post.images);
        return Array.isArray(parsed) ? parsed : [post.images];
      } catch {
        // 如果不是 JSON，按逗号分割
        return post.images.split(',').filter(Boolean);
      }
    }
    return [];
  }, [post.images]);

  const liked = post.isLiked ?? false;
  const favorited = post.isFavorited ?? false;

  const likeCount = typeof post.likeCount === 'number' ? post.likeCount :
                    typeof post.likeCount === 'string' ? parseInt(post.likeCount, 10) || 0 : 0;
  const favoriteCount = typeof post.favoriteCount === 'number' ? post.favoriteCount :
                        typeof post.favoriteCount === 'string' ? parseInt(post.favoriteCount, 10) || 0 : 0;

  // Check follow status when component mounts or user logs in
  useEffect(() => {
    if (isLoggedIn && post.user.id) {
      void checkAndCacheStatus(post.user.id);
    }
  }, [isLoggedIn, post.user.id, checkAndCacheStatus]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      void message.info('请先登录');
      navigate('/login');
      return;
    }
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
        setFollowStatus(post.user.id, false);
        void message.success('已取消关注');
      } else {
        await followUser(post.user.id);
        setFollowStatus(post.user.id, true);
        void message.success('关注成功');
      }
    } catch (error: any) {
      // If there's an error, refresh the actual follow status from server
      void checkAndCacheStatus(post.user.id);
      // Show specific error message if available
      const errorMessage = error?.response?.data?.error || error?.message || '操作失败';
      void message.error(errorMessage);
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
    if (rank === 0) return {
      badge: '1',
      bg: 'linear-gradient(135deg, #ff6b35 0%, #ffb347 100%)',
      shadow: '0 6px 20px rgba(255, 107, 53, 0.5)'
    };
    if (rank === 1) return {
      badge: '2',
      bg: 'linear-gradient(135deg, #ff8e53 0%, #ffc170 100%)',
      shadow: '0 6px 20px rgba(255, 142, 83, 0.5)'
    };
    if (rank === 2) return {
      badge: '3',
      bg: 'linear-gradient(135deg, #ffb347 0%, #ffd700 100%)',
      shadow: '0 6px 20px rgba(255, 179, 71, 0.5)'
    };
    return null;
  };

  const rankStyle = getRankBadge();

  return (
    <>
      <Card
        hoverable
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: isHovered ? '0 6px 20px rgba(0,0,0,0.12)' : '0 2px 10px rgba(0,0,0,0.08)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          border: isHovered ? '1px solid rgba(255, 107, 53, 0.3)' : '1px solid #f0f0f0',
          transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
          height: 480,
          width: '100%',
        }}
        bodyStyle={{
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%'
        }}
        onClick={() => navigate(`/post/${post.id}`, { state: { from } })}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 排名徽章 */}
        {rankStyle && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 10,
              width: 36,
              height: 36,
              borderRadius: 10,
              background: rankStyle.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 800,
              boxShadow: rankStyle.shadow,
              color: '#fff',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              letterSpacing: '-0.5px'
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
            height: 280,
            borderRadius: 10,
            overflow: 'hidden',
            backgroundColor: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            marginBottom: 12,
            flexShrink: 0,
            boxShadow: '0 3px 10px rgba(0,0,0,0.08)'
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
              fontSize: 40
            }}>
              🍜
            </div>
          )}

          {/* 多图标记 */}
          {processedImages.length > 1 && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                borderRadius: 18,
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 600,
                background: 'rgba(0,0,0,0.65)',
                color: '#fff',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: 3
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
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
                background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.95) 0%, rgba(255, 179, 71, 0.95) 100%)',
                color: '#fff',
                borderRadius: 10,
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
                boxShadow: '0 4px 16px rgba(255, 107, 53, 0.4)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                letterSpacing: '-0.5px'
              }}
            >
              {rank + 1}
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
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{
              marginBottom: 10,
              fontSize: 14,
              lineHeight: '1.5',
              minHeight: 42,
              maxHeight: 42,
              overflow: 'hidden',
              color: '#262626',
              fontWeight: 400
            }}
          >
            {post.content}
          </Paragraph>

          {/* 地址 */}
          <div
            onClick={() => {
              if (post.address) {
                setShowMapModal(true);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 10,
              fontSize: 12,
              color: post.address ? '#ff6b35' : '#8c8c8c',
              minHeight: 22,
              maxHeight: 22,
              overflow: 'hidden',
              padding: '5px 8px',
              background: post.address ? 'linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(255, 179, 71, 0.05) 100%)' : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 20%)',
              borderRadius: 6,
              border: post.address ? '1px solid rgba(255, 107, 53, 0.2)' : '1px solid #e8e8e8',
              cursor: post.address ? 'pointer' : 'default',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (post.address) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0%, rgba(255, 179, 71, 0.1) 100%)';
                e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.4)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (post.address) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(255, 179, 71, 0.05) 100%)';
                e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <EnvironmentOutlined style={{ marginRight: 5, fontSize: 11, flexShrink: 0, color: post.address ? '#ff6b35' : '#667eea' }} />
            <Text
              type="secondary"
              style={{ fontSize: 12, color: post.address ? '#ff6b35' : '#8c8c8c' }}
              ellipsis={{ tooltip: post.address }}
            >
              {post.address ? formatAddress(post.address) : '暂无地址'}
            </Text>
            {post.address && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#ff6b35', opacity: 0.7 }}>
                查看地图 →
              </span>
            )}
          </div>
        </div>

        {/* 用户信息和互动 */}
        <div style={{
          paddingTop: 10,
          borderTop: '1px solid #f0f0f0',
          flexShrink: 0,
          marginTop: 'auto'
        }}>
          {/* 第一行：头像、用户名、关注按钮 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10
          }}>
            <Avatar
              src={getAvatarUrl(post.user)}
              icon={<UserOutlined />}
              size={32}
              onClick={handleUserClick}
              style={{
                cursor: 'pointer',
                border: '2px solid #fff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#262626',
                  display: 'block'
                }}
                onClick={handleUserClick}
              >
                {post.user.username}
              </Text>
            </div>
            {isLoggedIn && post.user.id !== useAuthStore.getState().user?.id && (
              <Button
                type={isFollowing ? 'default' : 'primary'}
                size="small"
                icon={isFollowing ? <CheckOutlined /> : <PlusOutlined />}
                onClick={handleFollow}
                loading={followLoading}
                style={{
                  padding: '3px 12px',
                  height: 28,
                  fontSize: 12,
                  borderRadius: 14,
                  fontWeight: 500,
                  boxShadow: isFollowing ? 'none' : '0 2px 8px rgba(102, 126, 234, 0.3)'
                }}
              >
                {isFollowing ? '已关注' : '关注'}
              </Button>
            )}
          </div>

          {/* 第二行：点赞、收藏、评论 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 3,
            padding: '6px 6px',
            background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
            borderRadius: 10,
            overflow: 'hidden',
            height: '36px'
          }}>
            <div
              onClick={handleLike}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 8,
                transition: 'all 0.3s ease',
                background: liked ? 'rgba(255, 77, 79, 0.1)' : 'transparent',
                color: liked ? '#ff4d4f' : '#8c8c8c',
                minWidth: 0,
                height: '100%',
                boxSizing: 'border-box'
              }}
            >
              {liked ? <HeartFilled style={{ fontSize: 14, flexShrink: 0 }} /> : <HeartOutlined style={{ fontSize: 14, flexShrink: 0 }} />}
              <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {likeCount > 0 ? likeCount : '赞'}
              </span>
            </div>
            <div
              onClick={handleFavorite}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 8,
                transition: 'all 0.3s ease',
                background: favorited ? 'rgba(250, 173, 20, 0.1)' : 'transparent',
                color: favorited ? '#faad14' : '#8c8c8c',
                minWidth: 0,
                height: '100%',
                boxSizing: 'border-box'
              }}
            >
              {favorited ? <StarFilled style={{ fontSize: 14, flexShrink: 0 }} /> : <StarOutlined style={{ fontSize: 14, flexShrink: 0 }} />}
              <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {favoriteCount > 0 ? favoriteCount : '藏'}
              </span>
            </div>
            <div
              onClick={() => navigate(`/post/${post.id}`, { state: { from } })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 8,
                transition: 'all 0.3s ease',
                color: '#8c8c8c',
                minWidth: 0,
                height: '100%',
                boxSizing: 'border-box'
              }}
            >
              <CommentOutlined style={{ fontSize: 14, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(post.commentCount ?? 0) > 0 ? post.commentCount : '评'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 用户信息弹窗 */}
      {showUserModal && (
        <UserModal
          user={post.user}
          visible={showUserModal}
          onClose={() => setShowUserModal(false)}
          onOpenChat={() => setShowChatModal(true)}
        />
      )}

      {/* 地图弹窗 */}
      <MapModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        address={post.address || ''}
      />

      {/* 私信弹窗 */}
      {showChatModal && (
        <ChatModal
          visible={showChatModal}
          onClose={() => setShowChatModal(false)}
          otherUser={post.user}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}

// 用户信息弹窗组件
function UserModal({ user, visible, onClose, onOpenChat }: {
  user: { id: number; username: string; avatar?: string; bio?: string };
  visible: boolean;
  onClose: () => void;
  onOpenChat: () => void;
}) {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const currentUser = useAuthStore((s) => s.user);
  const followStatus = useFollowStore((s) => s.followStatus);
  const setFollowStatus = useFollowStore((s) => s.setFollowStatus);
  const checkAndCacheStatus = useFollowStore((s) => s.checkAndCacheStatus);
  const [followLoading, setFollowLoading] = useState(false);

  // Get follow status from global store
  const isFollowing = followStatus[user.id] ?? false;

  // Check follow status when modal becomes visible
  useEffect(() => {
    if (visible && isLoggedIn) {
      void checkAndCacheStatus(user.id);
    }
  }, [visible, isLoggedIn, user.id, checkAndCacheStatus]);

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
      // If there's an error, refresh the actual follow status from server
      void checkAndCacheStatus(user.id);
      // Show specific error message if available
      const errorMessage = error?.response?.data?.error || error?.message || '操作失败';
      void message.error(errorMessage);
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
        bodyStyle={{ padding: 0 }}
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
              fontSize: 18,
              zIndex: 1
            }}
          >
            ✕
          </Button>
        </div>

        {/* 用户头像和信息 */}
        <div style={{
          textAlign: 'center',
          marginBottom: 20,
          marginTop: -50,
          position: 'relative',
          zIndex: 2,
          padding: '0 16px'
        }}>
          <Avatar
            src={getAvatarUrl(user)}
            icon={<UserOutlined />}
            size={90}
            style={{
              marginBottom: 12,
              border: '4px solid #fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          />
          <Typography.Title level={4} style={{ margin: '0 0 4px 0', fontSize: 20, lineHeight: 1.3 }}>
            {user.username}
          </Typography.Title>
          <Text
            type="secondary"
            style={{
              fontSize: 13,
              display: 'block',
              maxWidth: 320,
              margin: '0 auto 12px',
              lineHeight: 1.4
            }}
            ellipsis={{ tooltip: user.bio }}
          >
            {user.bio || '这个人很懒，什么都没写 ✨'}
          </Text>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {isLoggedIn && user.id !== currentUser?.id && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
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
                    height: 42,
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
                    height: 38,
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
              height: 42,
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
