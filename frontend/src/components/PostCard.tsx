import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { toggleLike, toggleFavorite } from '../api/post';
import { useAuthStore } from '../store/auth';
import { useFollowStore } from '../store/follow';
import PostCardImage from './PostCardImage';
import PostCardContent from './PostCardContent';
import PostCardUserInfo from './PostCardUserInfo';
import PostCardActions from './PostCardActions';
import FavoriteFolderSelect from './FavoriteFolderSelect';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import type { Post } from '../types';

interface Props {
  post: Post;
  onUpdate?: (updated: Partial<Post> & { id: number }) => void;
  showRank?: boolean;
  rank?: number;
  from?: string;
}

export default function PostCard({ post, onUpdate, showRank, rank, from = '/' }: Props) {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const followStatus = useFollowStore((s) => s.followStatus);
  const checkAndCacheStatus = useFollowStore((s) => s.checkAndCacheStatus);
  const { ref, isVisible } = useScrollAnimation();

  const [isHovered, setIsHovered] = useState(false);
  const [showFolderSelect, setShowFolderSelect] = useState(false);

  const isFollowing = followStatus[post.user.id] ?? false;

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

    // 如果是取消收藏（已收藏），直接执行
    if (favorited) {
      try {
        const res = await toggleFavorite(post.id);
        onUpdate?.({ id: post.id, isFavorited: res.favorited, favoriteCount: res.favoriteCount });
      } catch { /* ignore */ }
      return;
    }

    // 如果是收藏，显示文件夹选择对话框
    setShowFolderSelect(true);
  };

  const handleFolderConfirm = async (folderId: number | null) => {
    try {
      const res = await toggleFavorite(post.id, folderId);
      onUpdate?.({ id: post.id, isFavorited: res.favorited, favoriteCount: res.favoriteCount });
      if (res.favorited) {
        void message.success('收藏成功');
      } else {
        void message.success('已取消收藏');
      }
    } catch { /* ignore */ }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem('returning_from_detail', 'true');
    navigate(`/post/${post.id}`, { state: { from } });
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
        onClick={() => {
          // 标记为从详情页返回，这样返回首页时不会刷新数据
          sessionStorage.setItem('returning_from_detail', 'true');
          navigate(`/post/${post.id}`, { state: { from } });
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 图片区域 */}
        <PostCardImage
          post={post}
          rankBadge={rankBadge}
          rank={rank}
        />

        {/* 内容区域 */}
        <PostCardContent post={post} />

        {/* 用户信息和互动 */}
        <PostCardUserInfo
          user={post.user}
          isFollowing={isFollowing}
        />

        {/* 交互按钮 */}
        <PostCardActions
          liked={liked}
          favorited={favorited}
          likeCount={likeCount}
          favoriteCount={favoriteCount}
          commentCount={commentCount}
          onLike={handleLike}
          onFavorite={handleFavorite}
          onComment={handleComment}
        />
      </article>

      {/* 收藏文件夹选择 */}
      <FavoriteFolderSelect
        visible={showFolderSelect}
        onClose={() => setShowFolderSelect(false)}
        onConfirm={handleFolderConfirm}
      />
    </>
  );
}