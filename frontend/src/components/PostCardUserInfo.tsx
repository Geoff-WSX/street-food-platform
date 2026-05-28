import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { followUser, unfollowUser } from '../api/follow';
import { useAuthStore } from '../store/auth';
import { useFollowStore } from '../store/follow';
import UserAvatar from './common/UserAvatar';
import UserProfileModal from './common/UserProfileModal';
import type { User } from '../types';

interface PostCardUserInfoProps {
  user: User;
  isFollowing: boolean;
  onFollowStatusChange?: (userId: number, status: boolean) => void;
  onOpenChat?: (user: User) => void;
}

export default function PostCardUserInfo({
  user,
  isFollowing,
  onFollowStatusChange,
  onOpenChat
}: PostCardUserInfoProps) {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const currentUser = useAuthStore((s) => s.user);
  const setFollowStatus = useFollowStore((s) => s.setFollowStatus);
  const checkAndCacheStatus = useFollowStore((s) => s.checkAndCacheStatus);

  const [followLoading, setFollowLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const handleUserClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowUserModal(true);
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
        await unfollowUser(user.id);
        setFollowStatus(user.id, false);
        onFollowStatusChange?.(user.id, false);
        void message.success('已取消关注');
      } else {
        await followUser(user.id);
        setFollowStatus(user.id, true);
        onFollowStatusChange?.(user.id, true);
        void message.success('关注成功');
      }
    } catch (error) {
      void checkAndCacheStatus(user.id);
      const axiosError = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = axiosError?.response?.data?.error || axiosError?.message || '操作失败';
      void message.error(errorMessage);
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <>
      <div className="post-user-area">
        <UserAvatar
          user={user}
          size={36}
          onClick={handleUserClick}
          className="post-user-avatar"
        />
        <div className="post-user-info">
          <span className="post-user-name" onClick={handleUserClick}>
            {user.username}
          </span>
        </div>
        {isLoggedIn && user.id !== currentUser?.id && (
          <button
            className={`follow-btn-urban ${isFollowing ? 'following' : 'follow'}`}
            onClick={handleFollow}
            disabled={followLoading}
          >
            {isFollowing ? '已关注' : '+ 关注'}
          </button>
        )}
      </div>

      {/* 用户信息弹窗 */}
      <UserProfileModal
        user={user}
        visible={showUserModal}
        onClose={() => setShowUserModal(false)}
        onOpenChat={() => onOpenChat?.(user)}
      />
    </>
  );
}