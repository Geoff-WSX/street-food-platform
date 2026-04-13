import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, message } from 'antd';
import {
  HeartOutlined, HeartFilled, StarOutlined, StarFilled,
  CommentOutlined, EnvironmentOutlined, UserOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { toggleLike, toggleFavorite } from '../api/post';
import { followUser, unfollowUser } from '../api/follow';
import { useAuthStore } from '../store/auth';
import { useFollowStore } from '../store/follow';
import { UserProfileModal } from '../components/common/UserProfileModal';
import ChatModal from './ChatModal';
import MapModal from './MapModal';
import type { Post } from '../types';
import { getAvatarUrl, parseImages } from '../utils/images';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

interface Props {
  post: Post;
  onUpdate?: (updated: Partial<Post> & { id: number }) => void;
  showRank?: boolean;
  rank?: number;
  from?: string;
}

const getRandomFood = () => {
  const foods = ['🍜', '🍕', '🍔', '🍣', '🥘', '🌮', '🥡', '🍱', '🥙', '🥪'];
  return foods[Math.floor(Math.random() * foods.length)];
};

const calculateReadingStats = (content: string) => {
  const charCount = content.replace(/\s/g, '').length;
  const readingTime = Math.ceil(charCount / 400);
  return { charCount, readingTime: Math.max(1, readingTime) };
};

function ActionButton({
  type, active = false, count = 0, onClick, loading = false
}: {
  type: 'like' | 'favorite' | 'comment';
  active?: boolean;
  count?: number;
  onClick?: (e: React.MouseEvent) => void;
  loading?: boolean;
}) {
  const icons = {
    like: { active: <HeartFilled />, inactive: <HeartOutlined /> },
    favorite: { active: <StarFilled />, inactive: <StarOutlined /> },
    comment: { active: <CommentOutlined />, inactive: <CommentOutlined /> },
  };
  const labels = { like: '赞', favorite: '藏', comment: '评' };

  return (
    <button
      className={`action-btn-urban ${type} ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={loading}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {active ? icons[type].active : icons[type].inactive}
        <span>{count > 0 ? count : labels[type]}</span>
      </span>
    </button>
  );
}

export default function PostCard({ post, onUpdate, showRank, rank, from = '/' }: Props) {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const currentUser = useAuthStore((s) => s.user);
  const followStatus = useFollowStore((s) => s.followStatus);
  const setFollowStatus = useFollowStore((s) => s.setFollowStatus);
  const checkAndCacheStatus = useFollowStore((s) => s.checkAndCacheStatus);
  const { ref, isVisible } = useScrollAnimation();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isFollowing = followStatus[post.user.id] ?? false;

  const processedImages = useMemo(() => {
    return parseImages(post.images);
  }, [post.images]);

  const liked = post.isLiked ?? false;
  const favorited = post.isFavorited ?? false;
  const likeCount = typeof post.likeCount === 'number' ? post.likeCount : parseInt(post.likeCount as string, 10) || 0;
  const favoriteCount = typeof post.favoriteCount === 'number' ? post.favoriteCount : parseInt(post.favoriteCount as string, 10) || 0;
  const commentCount = post.commentCount ?? 0;

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
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/post/${post.id}`, { state: { from } });
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
      void checkAndCacheStatus(post.user.id);
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
    if (rank === 0) return { badge: '1', className: 'gold' };
    if (rank === 1) return { badge: '2', className: 'silver' };
    if (rank === 2) return { badge: '3', className: 'bronze' };
    return null;
  };

  const rankBadge = getRankBadge();

  return (
    <>
      <article
        ref={ref as React.RefObject<HTMLElement>}
        className={`post-card-urban scroll-fade-in ${isVisible ? 'visible' : ''} ${isHovered ? 'hovered' : ''}`}
        onClick={() => navigate(`/post/${post.id}`, { state: { from } })}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 排名徽章 */}
        {rankBadge && (
          <div className={`rank-badge-urban ${rankBadge.className}`}>
            {rankBadge.badge}
          </div>
        )}
        {showRank && rank !== undefined && rank > 2 && (
          <div className="rank-badge-urban default">{rank + 1}</div>
        )}

        {/* 图片区域 */}
        <div className="post-image-container">
          {processedImages.length > 0 && !imageError ? (
            <img
              src={processedImages[0]}
              alt="post"
              className={imageLoaded ? 'loaded' : 'loading'}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="post-placeholder">{getRandomFood()}</div>
          )}

          {/* 多图标记 */}
          {processedImages.length > 1 && (
            <div className="multi-image-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
              {processedImages.length}
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="post-content-area">
          <p className="post-content-text">{post.content}</p>

          {/* 阅读统计 */}
          {post.content && (
            <div className="post-stats">
              <span><ClockCircleOutlined />{calculateReadingStats(post.content).readingTime}分钟</span>
              <span>·</span>
              <span>{calculateReadingStats(post.content).charCount}字</span>
            </div>
          )}

          {/* 地址 */}
          {post.address && (
            <div
              className="post-location"
              onClick={(e) => {
                e.stopPropagation();
                setShowMapModal(true);
              }}
            >
              <EnvironmentOutlined />
              <span>{formatAddress(post.address)}</span>
            </div>
          )}

          {/* 用户信息和互动 */}
          <div className="post-user-area">
            <Avatar
              src={getAvatarUrl(post.user)}
              icon={<UserOutlined />}
              size={36}
              onClick={handleUserClick}
              className="post-user-avatar"
            />
            <div className="post-user-info">
              <span className="post-user-name" onClick={handleUserClick}>
                {post.user.username}
              </span>
            </div>
            {isLoggedIn && post.user.id !== currentUser?.id && (
              <button
                className={`follow-btn-urban ${isFollowing ? 'following' : 'follow'}`}
                onClick={handleFollow}
                disabled={followLoading}
              >
                {isFollowing ? '已关注' : '+ 关注'}
              </button>
            )}
          </div>

          {/* 交互按钮 */}
          <div className="post-actions">
            <ActionButton type="like" active={liked} count={likeCount} onClick={handleLike} />
            <ActionButton type="favorite" active={favorited} count={favoriteCount} onClick={handleFavorite} />
            <ActionButton type="comment" count={commentCount} onClick={handleComment} />
          </div>
        </div>
      </article>

      {/* 用户信息弹窗 */}
      <UserProfileModal
        user={post.user}
        visible={showUserModal}
        onClose={() => setShowUserModal(false)}
        onOpenChat={() => setShowChatModal(true)}
      />

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
    </>
  );
}
