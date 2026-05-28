import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Avatar, Typography, Row, Col, Button, Form, Input,
  Upload, Spin, Empty, message, Modal, Card, Space, Tag, Select, Switch, List, Popconfirm, Tooltip
} from 'antd';
import { UserOutlined, EditOutlined, EnvironmentOutlined, LogoutOutlined, StopOutlined, MessageOutlined, UserAddOutlined, CheckOutlined, MessageOutlined as MessageIcon, WarningOutlined, TeamOutlined, FileTextOutlined, StarOutlined, PlusOutlined, SearchOutlined, DeleteOutlined, CaretDownOutlined, RocketOutlined, UploadOutlined, SmileOutlined } from '@ant-design/icons';
import { getUserById, updateProfile, updateAvatar, setDefaultAvatar, getDefaultAvatars, changePassword, updateMessageSettings, updatePrivacySettings, getCustomAvatars, addCustomAvatar, deleteCustomAvatar, type DefaultAvatar, type CustomAvatar } from '../api/user';
import { getUserPosts, getUserFavorites } from '../api/post';
import { getRecommendedPosts, deleteRecommend } from '../api/share';
import { cancelAllPendingRequests } from '../api/index';
import { getBlockedList, unblockUser, blockUser } from '../api/block';
import { getFollowing, getFollowers, followUser, unfollowUser } from '../api/follow';
import { sendFriendRequest, checkFriendship } from '../api/friend';
import { getMyLevelInfo, type UserLevelInfo } from '../api/level';
import { useAuthStore } from '../store/auth';
import { useFollowStore } from '../store/follow';
import { useFriendStore } from '../store/friend';
import PostCard from '../components/PostCard';
import ChatModal from '../components/ChatModal';
import ReportModal from '../components/ReportModal';
import WelcomeModal from '../components/WelcomeModal';
import { PageLayout } from '../components/layout';
import { StatBadge } from '../components/common/StatBadge';
import { LevelCard } from '../components/LevelCard';
import { LevelBadge } from '../components/LevelBadge';
import UserAvatar from '../components/common/UserAvatar';
import type { User, Post } from '../types';
import { getAvatarUrl } from '../utils/images';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const PAGE_SIZE = 12;

// 等级颜色映射
const LEVEL_COLORS: Record<number, string> = {
  1: '#8c8c8c',
  2: '#52c41a',
  3: '#1890ff',
  4: '#722ed1',
  5: '#fa8c16',
  6: '#f5222d',
};

// 等级图标映射
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

// 城市列表
const CITIES = [
  { name: '全部', value: '' },
  { name: '杭州', value: '杭州' },
  { name: '上海', value: '上海' },
  { name: '北京', value: '北京' },
  { name: '广州', value: '广州' },
  { name: '深圳', value: '深圳' },
  { name: '成都', value: '成都' },
  { name: '重庆', value: '重庆' },
  { name: '武汉', value: '武汉' },
  { name: '西安', value: '西安' },
];

export default function ProfilePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoggedIn, user: me, updateUser, logout } = useAuthStore();
  const followStatus = useFollowStore((s) => s.followStatus);
  const setFollowStatus = useFollowStore((s) => s.setFollowStatus);
  const checkAndCacheStatus = useFollowStore((s) => s.checkAndCacheStatus);

  // 使用 useMemo 确保在 URL 参数变化时重新计算
  // 修复：如果 userId 是用户名而不是数字ID，Number() 会返回 NaN，此时应使用当前登录用户的 ID
  const userIdParam = searchParams.get('userId');
  const viewUserId = React.useMemo(() => {
    console.log('🔍 viewUserId 计算:', { userIdParam, meId: me?.id });
    if (userIdParam) {
      const parsed = Number(userIdParam);
      // Only use the parsed number if it's not NaN (handles cases where username is passed instead of ID)
      if (!isNaN(parsed)) {
        console.log('🔍 viewUserId 返回 URL param:', parsed);
        return parsed;
      }
      console.warn('ProfilePage: userId param was not a valid number, falling back to current user ID', userIdParam);
    }
    console.log('🔍 viewUserId 返回 me.id:', me?.id);
    return me?.id;
  }, [userIdParam, me?.id]);

  const isOwner = React.useMemo(() => {
    return !userIdParam || Number(userIdParam) === me?.id;
  }, [userIdParam, me?.id]);

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myPostsTotal, setMyPostsTotal] = useState(0);
  const [myFavorites, setMyFavorites] = useState<Post[]>([]);
  const [recommendedPosts, setRecommendedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [loadingMoreFavorites, setLoadingMoreFavorites] = useState(false);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [favoritesHasMore, setFavoritesHasMore] = useState(true);
  const [postsCurrentPage, setPostsCurrentPage] = useState(1);
  const [favoritesCurrentPage, setFavoritesCurrentPage] = useState(1);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [defaultAvatars, setDefaultAvatars] = useState<DefaultAvatar[]>([]);
  const [customAvatars, setCustomAvatars] = useState<CustomAvatar[]>([]);
  const [avatarTab, setAvatarTab] = useState<'system' | 'custom'>('system');
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'posts');
  const [allowMessage, setAllowMessage] = useState(true);
  const [followOnlyMessage, setFollowOnlyMessage] = useState(false);
  const [hideFollowing, setHideFollowing] = useState(false);
  const [hideFollowers, setHideFollowers] = useState(false);
  const [hidePosts, setHidePosts] = useState(false);
  const [hideFavorites, setHideFavorites] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [following, setFollowing] = useState<User[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [followLoading, setFollowLoading] = useState(false);
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);
  const [levelLoading, setLevelLoading] = useState(false);
  const [levelCardOpen, setLevelCardOpen] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);

  // 好友 store
  const {
    friends,
    friendCount,
    loading: friendsLoading,
    fetchFriends,
    removeFriend
  } = useFriendStore();

  // 用于追踪当前请求ID的 ref（不会触发重新渲染）
  const currentRequestIdRef = React.useRef<number>(0);

  const fetchData = useCallback(async () => {
    // 递增请求ID，之前的请求将被忽略
    currentRequestIdRef.current += 1;
    const requestId = currentRequestIdRef.current;

    console.log('🔍 ProfilePage fetchData called:', {
      viewUserId,
      isOwner,
      isLoggedIn,
      meId: me?.id,
      searchParamsUserId: searchParams.get('userId'),
      requestId
    });
    if (!viewUserId) { navigate('/login'); return; }
    setLoading(true);
    try {
      const u = await getUserById(viewUserId);

      // 检查请求是否过期（如果用户切换了，这个请求应该被忽略）
      if (requestId !== currentRequestIdRef.current) {
        console.log('⚠️ 忽略过期的用户数据响应:', requestId, '当前请求ID:', currentRequestIdRef.current);
        return;
      }

      console.log('🔍 ProfilePage: fetched user', { userId: viewUserId, username: u.username, isOwner, requestId });
      setProfileUser(u);
      setAllowMessage(u.allowMessage ?? true);
      setFollowOnlyMessage(u.followOnlyMessage ?? false);
      setHideFollowing(u.hideFollowing ?? false);
      setHideFollowers(u.hideFollowers ?? false);
      setHidePosts(u.hidePosts ?? false);
      setHideFavorites(u.hideFavorites ?? false);

      // 检查请求是否过期
      if (requestId !== currentRequestIdRef.current) {
        console.log('⚠️ 忽略过期的动态请求:', requestId, '当前请求ID:', currentRequestIdRef.current);
        return;
      }

      const postsData = await getUserPosts(viewUserId, { page: 1, pageSize: PAGE_SIZE });

      // 再次检查请求是否过期
      if (requestId !== currentRequestIdRef.current) {
        console.log('⚠️ 忽略过期的动态响应:', requestId, '当前请求ID:', currentRequestIdRef.current);
        return;
      }

      // 防御性验证：过滤出只属于目标用户的动态
      const validPosts = postsData.data.filter(p => p.user?.id === viewUserId);
      const invalidCount = postsData.data.length - validPosts.length;
      if (invalidCount > 0) {
        console.warn('⚠️ 过滤了', invalidCount, '条不属于用户', viewUserId, '的动态, requestId:', requestId);
      }

      // 详细打印前5条动态的用户信息
      const first5Posts = postsData.data.slice(0, 5);
      first5Posts.forEach((p, i) => {
        console.log('🔍 postsData.data[' + i + ']:', { postId: p.id, userId: p.user?.id, username: p.user?.username, requestId });
      });

      const postUserIds = validPosts.slice(0, 5).map(p => p.user?.id);
      console.log('🔍 用户主页动态查询:', {
        viewUserId,
        username: u.username,
        postsReturned: validPosts.length,
        totalInResponse: postsData.pagination?.total,
        first5PostUserIds: postUserIds,
        isOwner,
        invalidCount,
        postsDataLength: postsData.data.length,
        requestId
      });
      setMyPosts(validPosts);
      // 使用 API 返回的真实总数
      setMyPostsTotal(postsData.pagination?.total || validPosts.length);
      // 设置分页状态
      setPostsHasMore(1 < (postsData.pagination?.totalPages || 1));
      setPostsCurrentPage(1);

      // 获取关注和粉丝列表
      const [followingData, followersData] = await Promise.all([
        getFollowing(viewUserId),
        getFollowers(viewUserId)
      ]);

      // 检查请求是否过期
      if (requestId !== currentRequestIdRef.current) {
        console.log('⚠️ 忽略过期的关注/粉丝响应:', requestId, '当前请求ID:', currentRequestIdRef.current);
        return;
      }

      setFollowing(followingData);
      setFollowers(followersData);

      // 检查关注状态并缓存到全局store
      if (isLoggedIn && me) {
        await Promise.all(
          [...followingData, ...followersData].map(async (user) => {
            try {
              await checkAndCacheStatus(user.id);
            } catch {
              // 忽略错误
            }
          })
        );
      }

      // 检查好友状态
      if (isLoggedIn && me && !isOwner) {
        try {
          const res = await checkFriendship(viewUserId);
          setIsFriend(!!res?.isFriend);
        } catch { setIsFriend(false); }
        // 检查是否被拉黑
        const blocked = await getBlockedList();
        const blockedByMe = blocked.some((b: User) => b.id === viewUserId);
        setIsBlocked(blockedByMe);
      }

      if (isOwner && isLoggedIn) {
        const favData = await getUserFavorites({ page: 1, pageSize: PAGE_SIZE });
        setMyFavorites(favData.data);
        setFavoritesHasMore(1 < (favData.pagination?.totalPages || 1));
        setFavoritesCurrentPage(1);
        // 获取推荐动态
        const recommendedData = await getRecommendedPosts({ pageSize: 50 });
        setRecommendedPosts(recommendedData.data);
        // 获取黑名单
        const blocked = await getBlockedList();
        setBlockedUsers(blocked);
        // 获取等级信息 - 暂时禁用
        // try {
        //   const levelData = await getMyLevelInfo();
        //   setLevelInfo(levelData);
        // } catch {
        //   console.error('获取等级信息失败');
        // }
      }
    } finally {
      // 只有当前最新的请求才更新 loading 状态
      if (requestId === currentRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [viewUserId, isOwner, isLoggedIn, navigate, me, checkAndCacheStatus, searchParams]);

  useEffect(() => {
    fetchData();
    // 组件卸载时取消所有进行中的请求
    return () => {
      cancelAllPendingRequests();
    };
  }, [fetchData]);

  // 当 viewUserId 变化时清除旧的动态数据
  useEffect(() => {
    // 清除之前的 posts 数据，防止闪现旧用户的数据
    setMyPosts([]);
    setMyPostsTotal(0);
  }, [viewUserId]);

  // 当 URL 参数中的 tab 变化时更新 activeTab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // 当查看自己的主页时，加载好友列表
  useEffect(() => {
    if (isOwner && isLoggedIn) {
      fetchFriends({ pageSize: 100 });
    }
  }, [isOwner, isLoggedIn, fetchFriends]);

  // 组件挂载时获取等级信息
  useEffect(() => {
    if (isOwner && isLoggedIn) {
      setLevelLoading(true);
      getMyLevelInfo()
        .then((data) => {
          setLevelInfo(data);
        })
        .catch((error) => {
          console.error('获取等级信息失败:', error);
        })
        .finally(() => {
          setLevelLoading(false);
        });
    }
  }, [isOwner, isLoggedIn]);

  const handleEditProfile = async (values: { username: string; bio?: string }) => {
    setEditLoading(true);
    try {
      const updated = await updateProfile(values);
      updateUser(updated);
      setProfileUser(updated);
      setEditModalOpen(false);
      void message.success('资料已更新');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAvatarChange = async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const updated = await updateAvatar(formData);
      updateUser(updated);
      setProfileUser(updated);
      void message.success('头像已更新');
    } catch {
      // 忽略错误
    }
    return false;
  };

  // 打开头像选择弹窗
  const handleOpenAvatarModal = async () => {
    try {
      const [systemAvatars, userCustomAvatars] = await Promise.all([
        getDefaultAvatars(),
        getCustomAvatars()
      ]);
      setDefaultAvatars(systemAvatars || []);
      setCustomAvatars(userCustomAvatars || []);
      setAvatarTab('system');
      setAvatarModalOpen(true);
    } catch {
      void message.error('加载头像列表失败');
    }
  };

  const handleChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
    await changePassword(values);
    void message.success('密码已修改，请重新登录');
    setPwdModalOpen(false);
    pwdForm.resetFields();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleUnblock = async (userId: number) => {
    try {
      await unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      void message.success('已取消拉黑');
    } catch {
      void message.error('操作失败');
    }
  };

  const loadBlockedUsers = async () => {
    setBlockedLoading(true);
    try {
      const blocked = await getBlockedList();
      setBlockedUsers(blocked);
    } finally {
      setBlockedLoading(false);
    }
  };

  const handleFollowUser = async (userId: number, userToAdd?: User) => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }
    setFollowLoading(true);
    try {
      await followUser(userId);
      setFollowStatus(userId, true);
      // 如果提供了用户信息，添加到关注列表
      if (userToAdd) {
        setFollowing(prev => {
          if (prev.some(u => u.id === userId)) return prev;
          return [...prev, { ...userToAdd, id: userId }];
        });
      }
      void message.success('关注成功');
    } catch (error: any) {
      // If there's an error, refresh the actual follow status from server
      void checkAndCacheStatus(userId);
      // Show specific error message if available
      const errorMessage = error?.response?.data?.error || error?.message || '操作失败';
      void message.error(errorMessage);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollowUser = async (userId: number) => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }
    setFollowLoading(true);
    try {
      await unfollowUser(userId);
      setFollowStatus(userId, false);
      // 如果在关注列表中，从列表中移除
      setFollowing(prev => prev.filter(u => u.id !== userId));
      // 如果在粉丝列表中，移除该用户
      setFollowers(prev => prev.filter(u => u.id !== userId));
      void message.success('已取消关注');
    } catch (error: any) {
      // If there's an error, refresh the actual follow status from server
      void checkAndCacheStatus(userId);
      // Show specific error message if available
      const errorMessage = error?.response?.data?.error || error?.message || '操作失败';
      void message.error(errorMessage);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleOpenChat = (user: User) => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }
    setChatUser(user);
    setShowChatModal(true);
  };

  const handleAddFriend = async () => {
    if (!isLoggedIn || !profileUser) return;
    setFriendLoading(true);
    try {
      const response = await sendFriendRequest(profileUser.id);

      // 检查是否自动接受（双方互发好友请求）
      if (response?.autoAccepted) {
        const successMsg = response?.message || '对方也向你发送了好友请求，你们已成为好友！';
        void message.success(successMsg);
        setIsFriend(true); // 直接设为好友
        // 刷新好友列表
        const { fetchFriends } = useFriendStore.getState();
        fetchFriends({ pageSize: 100 });
      } else {
        void message.success('好友请求已发送');
        setIsFriend(false); // 等待确认
      }
    } catch (error: any) {
      const errMsg = error?.response?.data?.error || error?.message || '发送失败';
      void message.error(errMsg);
    } finally {
      setFriendLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!isLoggedIn || !profileUser) return;
    try {
      await blockUser(profileUser.id);
      setIsBlocked(true);
      void message.success('已拉黑该用户');
    } catch (error: any) {
      const errMsg = error?.response?.data?.error || error?.message || '操作失败';
      void message.error(errMsg);
    }
  };

  const handleSearchFriends = () => {
    fetchFriends({ search: friendSearch || undefined, pageSize: 100 });
  };

  const handleRemoveFriend = async (friendId: number) => {
    try {
      await removeFriend(friendId);
      void message.success('已删除好友');
    } catch {
      void message.error('删除失败');
    }
  };

  const handleLoadMorePosts = async () => {
    if (!viewUserId || loadingMorePosts || !postsHasMore) return;
    setLoadingMorePosts(true);
    try {
      const nextPage = postsCurrentPage + 1;
      const data = await getUserPosts(viewUserId, { page: nextPage, pageSize: PAGE_SIZE });
      const validPosts = data.data.filter(p => p.user?.id === viewUserId);
      setMyPosts(prev => [...prev, ...validPosts]);
      setPostsCurrentPage(nextPage);
      setPostsHasMore(nextPage < (data.pagination?.totalPages || 1));
    } catch {
      void message.error('加载更多动态失败');
    } finally {
      setLoadingMorePosts(false);
    }
  };

  const handleLoadMoreFavorites = async () => {
    if (!viewUserId || loadingMoreFavorites || !favoritesHasMore) return;
    setLoadingMoreFavorites(true);
    try {
      const nextPage = favoritesCurrentPage + 1;
      const data = await getUserFavorites({ page: nextPage, pageSize: PAGE_SIZE });
      setMyFavorites(prev => [...prev, ...data.data]);
      setFavoritesCurrentPage(nextPage);
      setFavoritesHasMore(nextPage < (data.pagination?.totalPages || 1));
    } catch {
      void message.error('加载更多收藏失败');
    } finally {
      setLoadingMoreFavorites(false);
    }
  };

  // 删除推荐动态
  const handleDeleteRecommended = async (postId: number) => {
    try {
      await deleteRecommend(postId);
      setRecommendedPosts(prev => prev.filter(p => p.id !== postId));
      message.success('已从推荐中移除');
    } catch {
      message.error('移除失败');
    }
  };

  // 检查是否互关
  const isMutualFollow = (userId: number) => {
    return following.some(u => u.id === userId) && followers.some(u => u.id === userId);
  };

  // 渲染用户列表项
  const renderUserItem = (user: User, listType?: 'following' | 'followers' | 'friends') => {
    // 检查是否互关
    const mutual = isMutualFollow(user.id);
    // 检查是否已关注
    const isFollowing = listType === 'following' || followStatus[user.id];

    return (
      <List.Item
        key={user.id}
        className="food-user-list"
        style={{
          padding: '10px 12px',
          borderRadius: 10,
          marginBottom: 6,
          backgroundColor: 'linear-gradient(135deg, rgba(255, 248, 240, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%)',
          border: '1px solid rgba(255, 107, 53, 0.1)'
        }}
      >
        <List.Item.Meta
          avatar={
            <UserAvatar
              user={user}
              size={40}
              onClick={() => navigate(`/profile?userId=${user.id}`)}
            />
          }
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text
                strong
                style={{ fontSize: 14, cursor: 'pointer' }}
                onClick={() => navigate(`/profile?userId=${user.id}`)}
              >
                {user.username}
              </Text>
              {isLoggedIn && me && user.id !== me.id && (
                <Space size={6}>
                  {/* 互关显示互关，已关注显示已关注，未关注显示关注 */}
                  {mutual ? (
                    <Button
                      icon={<TeamOutlined />}
                      onClick={() => handleUnfollowUser(user.id)}
                      loading={followLoading}
                      size="small"
                      style={{ borderRadius: 14, height: 28, fontSize: 12, background: 'linear-gradient(135deg, #f759ab 0%, #ff9c6e 100%)', border: 'none', color: '#fff' }}
                    >
                      互关
                    </Button>
                  ) : isFollowing ? (
                    <Button
                      icon={<CheckOutlined />}
                      onClick={() => handleUnfollowUser(user.id)}
                      loading={followLoading}
                      size="small"
                      style={{ borderRadius: 14, height: 28, fontSize: 12 }}
                    >
                      已关注
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      icon={<UserAddOutlined />}
                      onClick={() => handleFollowUser(user.id, user)}
                      loading={followLoading}
                      size="small"
                      style={{ borderRadius: 14, height: 28, fontSize: 12, background: 'linear-gradient(135deg, #ff6b35 0%, #ff8e53 100%)', border: 'none' }}
                    >
                      关注
                    </Button>
                  )}
                  <Button
                    icon={<MessageIcon />}
                    onClick={() => handleOpenChat(user)}
                    size="small"
                    style={{ borderRadius: 14, height: 28, fontSize: 12 }}
                  >
                    私信
                  </Button>
                </Space>
              )}
            </div>
          }
          description={
            <Text type="secondary" style={{ fontSize: 12 }}>
              {user.bio || '这个人很懒，什么都没写'}
            </Text>
          }
        />
      </List.Item>
    );
  };

  if (!isLoggedIn && !viewUserId) {
    navigate('/login');
    return null;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Space direction="vertical" style={{ gap: 16, textAlign: 'center' }}>
          <Spin size="large" />
          <Text type="secondary" style={{ fontSize: 15 }}>加载个人主页中...</Text>
        </Space>
      </div>
    );
  }
  if (!profileUser) return <div style={{ textAlign: 'center', marginTop: 80 }}>用户不存在</div>;

  // 根据城市过滤
  const filterByCity = (posts: Post[]) => {
    if (!selectedCity) return posts;
    return posts.filter(post => {
      const address = post.address || '';
      return address.includes(selectedCity);
    });
  };

  const filteredPosts = filterByCity(myPosts);
  const filteredFavorites = filterByCity(myFavorites);

  const PostGrid = ({ posts, hasMore, loadingMore, onLoadMore, onUpdate }: {
    posts: Post[];
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
    onUpdate?: (u: Partial<Post> & { id: number }) => void;
  }) => (
    posts.length === 0 ? (
      <Empty
        description={selectedCity ? `${selectedCity}暂无内容` : '暂无内容'}
        style={{ padding: '32px 0' }}
      />
    ) : (
      <>
        <Row gutter={[14, 14]}>
          {posts.map((p) => (
            <Col key={p.id} xs={24} sm={12} md={8} lg={6}>
              <div style={{ height: 480, width: '100%' }}>
                <PostCard post={p} from="/profile" onUpdate={(u) => {
                  setMyPosts((prev) => prev.map((x) => x.id === u.id ? { ...x, ...u } : x));
                  if (onUpdate) {
                    onUpdate(u);
                  } else {
                    setMyFavorites((prev) => prev.map((x) => x.id === u.id ? { ...x, ...u } : x));
                  }
                }} />
              </div>
            </Col>
          ))}
        </Row>
        {hasMore && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Button
              onClick={onLoadMore}
              loading={loadingMore}
              size="large"
              icon={<CaretDownOutlined />}
              style={{ minWidth: 160, borderRadius: 20, height: 44 }}
            >
              {loadingMore ? '加载中...' : '加载更多'}
            </Button>
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#999' }}>
            已展示全部内容
          </div>
        )}
      </>
    )
  );

  const tabItems = [
    // 动态标签页 - 只有所有者或未隐藏动态时显示
    ...(isOwner || !profileUser?.hidePosts ? [{
      key: 'posts',
      label: `动态 ${myPostsTotal > 0 ? `(${myPostsTotal})` : ''}`,
      children: (
        <>
          {/* 城市筛选 */}
          {myPosts.length > 0 && (
            <Card size="small" style={{ marginBottom: 12, borderRadius: 8 }}>
              <Space size={10}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <EnvironmentOutlined /> 筛选：
                </Text>
                <Select
                  value={selectedCity}
                  onChange={setSelectedCity}
                  style={{ width: 90 }}
                  size="small"
                >
                  {CITIES.map(city => (
                    <Option key={city.value} value={city.value}>{city.name}</Option>
                  ))}
                </Select>
                {selectedCity && (
                  <Tag closable onClose={() => setSelectedCity('')} style={{ borderRadius: 10, fontSize: 12 }}>
                    {selectedCity} ({filteredPosts.length})
                  </Tag>
                )}
              </Space>
            </Card>
          )}
          {!isOwner && profileUser?.hidePosts ? (
            <Empty description="该用户已隐藏动态" style={{ padding: '32px 0' }} />
          ) : (
            <PostGrid
              posts={filteredPosts}
              hasMore={postsHasMore}
              loadingMore={loadingMorePosts}
              onLoadMore={handleLoadMorePosts}
            />
          )}
        </>
      )
    }] : []),
    // 关注标签页 - 只有所有者或未隐藏关注时显示
    ...(isOwner || !profileUser?.hideFollowing ? [{
      key: 'following',
      label: `关注 ${following.length > 0 ? `(${following.length})` : ''}`,
      children: (
        !isOwner && profileUser?.hideFollowing ? (
          <Empty description="该用户已隐藏关注列表" style={{ padding: '32px 0' }} />
        ) : following.length === 0 ? (
          <Empty description="暂无关注" style={{ padding: '32px 0' }} />
        ) : (
          <List
            dataSource={following}
            renderItem={(user) => renderUserItem(user, 'following')}
          />
        )
      )
    }] : []),
    // 粉丝标签页 - 只有所有者或未隐藏粉丝时显示
    ...(isOwner || !profileUser?.hideFollowers ? [{
      key: 'followers',
      label: `粉丝 ${followers.length > 0 ? `(${followers.length})` : ''}`,
      children: (
        !isOwner && profileUser?.hideFollowers ? (
          <Empty description="该用户已隐藏粉丝列表" style={{ padding: '32px 0' }} />
        ) : followers.length === 0 ? (
          <Empty description="暂无粉丝" style={{ padding: '32px 0' }} />
        ) : (
          <List
            dataSource={followers}
            renderItem={(user) => renderUserItem(user, 'followers')}
          />
        )
      )
    }] : []),
    // 好友标签页 - 只有所有者可见
    ...(isOwner ? [{
      key: 'friends',
      label: `好友 ${friendCount > 0 ? `(${friendCount})` : ''}`,
      children: (
        <>
          <Card size="small" style={{ marginBottom: 12, borderRadius: 8 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="搜索好友..."
                prefix={<SearchOutlined />}
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                onPressEnter={handleSearchFriends}
                size="small"
              />
              <Button type="primary" onClick={handleSearchFriends} size="small">
                搜索
              </Button>
            </Space.Compact>
          </Card>
          {friendsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
            </div>
          ) : friends.length === 0 ? (
            <Empty
              description={friendSearch ? '没有找到匹配的好友' : '暂无好友'}
              style={{ padding: '32px 0' }}
            >
              {!friendSearch && (
                <Button type="primary" onClick={() => navigate('/')}>
                  发现好友
                </Button>
              )}
            </Empty>
          ) : (
            <List
              dataSource={friends}
              renderItem={(friend) => {
                const friendUser: User = friend.user || (friend as unknown as User);
                const friendId = friend.userId || friend.id;
                return (
                  <List.Item
                    key={friendId}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      marginBottom: 6,
                      backgroundColor: 'linear-gradient(135deg, rgba(255, 248, 240, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%)',
                      border: '1px solid rgba(255, 107, 53, 0.1)'
                    }}
                    actions={[
                      <Button
                        key="chat"
                        icon={<MessageIcon />}
                        onClick={() => handleOpenChat(friendUser)}
                        size="small"
                        style={{ borderRadius: 14, height: 28, fontSize: 12 }}
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
                        <Button danger icon={<DeleteOutlined />} size="small" style={{ borderRadius: 14, height: 28, fontSize: 12 }}>
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
                          size={40}
                          style={{ cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)' }}
                          onClick={() => navigate(`/profile?userId=${friendId}`)}
                        />
                      }
                      title={
                        <Text
                          strong
                          style={{ fontSize: 14, cursor: 'pointer' }}
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
              }}
            />
          )}
        </>
      )
    }, {
      key: 'favorites',
      label: `收藏 ${myFavorites.length > 0 ? `(${myFavorites.length})` : ''}`,
      children: (
        <>
          {myFavorites.length > 0 && (
            <Card size="small" style={{ marginBottom: 12, borderRadius: 8 }}>
              <Space size={10}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <EnvironmentOutlined /> 筛选：
                </Text>
                <Select
                  value={selectedCity}
                  onChange={setSelectedCity}
                  style={{ width: 90 }}
                  size="small"
                >
                  {CITIES.map(city => (
                    <Option key={city.value} value={city.value}>{city.name}</Option>
                  ))}
                </Select>
                {selectedCity && (
                  <Tag closable onClose={() => setSelectedCity('')} style={{ borderRadius: 10, fontSize: 12 }}>
                    {selectedCity} ({filteredFavorites.length})
                  </Tag>
                )}
              </Space>
            </Card>
          )}
          <PostGrid
            posts={filteredFavorites}
            hasMore={favoritesHasMore}
            loadingMore={loadingMoreFavorites}
            onLoadMore={handleLoadMoreFavorites}
            onUpdate={(u) => {
              // 取消收藏时从列表中移除
              if (u.isFavorited === false) {
                setMyFavorites((prev) => prev.filter((x) => x.id !== u.id));
              } else {
                setMyFavorites((prev) => prev.map((x) => x.id === u.id ? { ...x, ...u } : x));
              }
            }}
          />
        </>
      )
    }, {
      key: 'recommended',
      label: `推荐 ${recommendedPosts.length > 0 ? `(${recommendedPosts.length})` : ''}`,
      children: (
        recommendedPosts.length === 0 ? (
          <Empty description="暂无推荐动态" style={{ padding: '32px 0' }} />
        ) : (
          <Row gutter={[14, 14]}>
            {recommendedPosts.map((p) => {
              const post = p as Post & { recommender?: { id: number; username: string; avatar?: string }; sharedAt?: string };
              return (
                <Col key={post.id} xs={24} sm={12} md={8} lg={6}>
                  <div style={{ height: 520, width: '100%', position: 'relative' }}>
                    {/* 推荐标记 */}
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 10,
                      background: 'linear-gradient(135deg, #ff6b35 0%, #ff8f5a 100%)',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <StarOutlined /> 推荐
                    </div>
                    {/* 删除按钮 */}
                    <Popconfirm
                      title="从推荐中移除"
                      description="确定要从推荐中移除这条动态吗？"
                      onConfirm={() => handleDeleteRecommended(post.id)}
                      okText="确定"
                      cancelText="取消"
                      placement="topLeft"
                    >
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 10,
                          borderRadius: 14,
                          width: 32,
                          height: 28,
                        }}
                      />
                    </Popconfirm>
                    <PostCard post={p} from="/profile" onUpdate={(u) => {
                      setRecommendedPosts((prev) => prev.map((x) => x.id === u.id ? { ...x, ...u } : x));
                    }} />
                    {/* 推荐来源信息 */}
                    {post.recommender && (
                      <div style={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        right: 8,
                        background: 'rgba(255,255,255,0.95)',
                        padding: '6px 10px',
                        borderRadius: 8,
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <span>推荐自</span>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); navigate(`/profile?userId=${post.recommender!.id}`); }}
                          style={{ color: '#ff6b35', fontWeight: 500 }}
                        >
                          @{post.recommender!.username}
                        </a>
                      </div>
                    )}
                  </div>
                </Col>
              );
            })}
          </Row>
        )
      )
    },
    {
      key: 'settings',
      label: '设置',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {/* 私信设置 */}
          <Card title="私信设置" size="small" style={{ borderRadius: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size={8}>
                  <MessageOutlined style={{ fontSize: 14 }} />
                  <Text style={{ fontSize: 14 }}>允许其他人给我发送私信</Text>
                </Space>
                <Switch
                  checked={allowMessage}
                  onChange={async (checked) => {
                    setAllowMessage(checked);
                    try {
                      const updated = await updateMessageSettings(checked, followOnlyMessage);
                      updateUser(updated);
                      void message.success(checked ? '已开启私信功能' : '已关闭私信功能');
                    } catch {
                      void message.error('设置失败，请重试');
                      setAllowMessage(!checked); // 恢复原状态
                    }
                  }}
                  checkedChildren="开"
                  unCheckedChildren="关"
                  loading={false}
                />
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                关闭后，其他用户无法给你发送私信
              </Text>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Space size={8}>
                  <UserOutlined style={{ fontSize: 14 }} />
                  <Text style={{ fontSize: 14 }}>仅允许关注我的人发送私信</Text>
                </Space>
                <Switch
                  checked={followOnlyMessage}
                  onChange={async (checked) => {
                    setFollowOnlyMessage(checked);
                    try {
                      const updated = await updateMessageSettings(allowMessage, checked);
                      updateUser(updated);
                      void message.success(checked ? '已开启仅关注可私信' : '已关闭仅关注可私信');
                    } catch {
                      void message.error('设置失败，请重试');
                      setFollowOnlyMessage(!checked); // 恢复原状态
                    }
                  }}
                  checkedChildren="开"
                  unCheckedChildren="关"
                  loading={false}
                  disabled={!allowMessage}
                />
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                开启后，只有关注你的用户才能给你发送私信
              </Text>
            </Space>
          </Card>

          {/* 隐私设置 */}
          <Card title="隐私设置" size="small" style={{ borderRadius: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size={8}>
                  <TeamOutlined style={{ fontSize: 14 }} />
                  <Text style={{ fontSize: 14 }}>隐藏我的关注列表</Text>
                </Space>
                <Switch
                  checked={hideFollowing}
                  onChange={async (checked) => {
                    setHideFollowing(checked);
                    try {
                      const updated = await updatePrivacySettings({ hideFollowing: checked });
                      updateUser(updated);
                      void message.success(checked ? '已隐藏关注列表' : '已显示关注列表');
                    } catch {
                      void message.error('设置失败，请重试');
                      setHideFollowing(!checked);
                    }
                  }}
                  checkedChildren="开"
                  unCheckedChildren="关"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size={8}>
                  <TeamOutlined style={{ fontSize: 14 }} />
                  <Text style={{ fontSize: 14 }}>隐藏我的粉丝列表</Text>
                </Space>
                <Switch
                  checked={hideFollowers}
                  onChange={async (checked) => {
                    setHideFollowers(checked);
                    try {
                      const updated = await updatePrivacySettings({ hideFollowers: checked });
                      updateUser(updated);
                      void message.success(checked ? '已隐藏粉丝列表' : '已显示粉丝列表');
                    } catch {
                      void message.error('设置失败，请重试');
                      setHideFollowers(!checked);
                    }
                  }}
                  checkedChildren="开"
                  unCheckedChildren="关"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size={8}>
                  <FileTextOutlined style={{ fontSize: 14 }} />
                  <Text style={{ fontSize: 14 }}>隐藏我的动态</Text>
                </Space>
                <Switch
                  checked={hidePosts}
                  onChange={async (checked) => {
                    setHidePosts(checked);
                    try {
                      const updated = await updatePrivacySettings({ hidePosts: checked });
                      updateUser(updated);
                      void message.success(checked ? '已隐藏动态' : '已显示动态');
                    } catch {
                      void message.error('设置失败，请重试');
                      setHidePosts(!checked);
                    }
                  }}
                  checkedChildren="开"
                  unCheckedChildren="关"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size={8}>
                  <StarOutlined style={{ fontSize: 14 }} />
                  <Text style={{ fontSize: 14 }}>隐藏我的收藏</Text>
                </Space>
                <Switch
                  checked={hideFavorites}
                  onChange={async (checked) => {
                    setHideFavorites(checked);
                    try {
                      const updated = await updatePrivacySettings({ hideFavorites: checked });
                      updateUser(updated);
                      void message.success(checked ? '已隐藏收藏' : '已显示收藏');
                    } catch {
                      void message.error('设置失败，请重试');
                      setHideFavorites(!checked);
                    }
                  }}
                  checkedChildren="开"
                  unCheckedChildren="关"
                />
              </div>
            </Space>
          </Card>

          {/* 黑名单管理 */}
          <Card
            title="黑名单"
            size="small"
            style={{ borderRadius: 8 }}
            extra={
              <Button
                icon={<StopOutlined />}
                onClick={loadBlockedUsers}
                loading={blockedLoading}
                size="small"
                style={{ borderRadius: 12 }}
              >
                刷新
              </Button>
            }
          >
            {blockedUsers.length === 0 ? (
              <Empty
                description="黑名单为空"
                style={{ padding: '16px 0' }}
              />
            ) : (
              <List
                dataSource={blockedUsers}
                renderItem={(user) => (
                  <List.Item
                    style={{ padding: '8px 0' }}
                    actions={[
                      <Popconfirm
                        title="确定要取消拉黑吗？"
                        onConfirm={() => handleUnblock(user.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button type="link" danger size="small">
                          取消拉黑
                        </Button>
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          src={getAvatarUrl(user)}
                          icon={<UserOutlined />}
                          size={36}
                        />
                      }
                      title={<span style={{ fontSize: 14 }}>{user.username}</span>}
                      description={user.bio || '这个人很懒，什么都没写'}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>

          {/* 关于平台 */}
          <Card title="关于平台" size="small" style={{ borderRadius: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Button
                icon={<RocketOutlined />}
                onClick={() => setWelcomeVisible(true)}
                style={{ borderRadius: 8, height: 40 }}
                block
              >
                查看网站介绍
              </Button>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center' }}>
                了解「食遇」平台功能和使用方法
              </Text>
            </Space>
          </Card>
        </Space>
      )
    }] : []),
  ];

  return (
    <PageLayout className="page-content" maxWidth={900}>
      {/* 用户信息卡片 */}
      <Card
        className="profile-header"
        style={{ marginBottom: 20 }}
        bodyStyle={{ padding: 0 }}
      >
        {/* 顶部装饰条 */}
        <div className="profile-header-banner" />

        <div className="profile-avatar-section">
          {/* 头像 */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Avatar
              size={90}
              src={getAvatarUrl(profileUser)}
              icon={<UserOutlined />}
              style={{
                border: '4px solid #fff',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
              }}
            />
            {/* 等级徽章 - 显示在头像底部，与头像融为一体 */}
            {profileUser.level && (
              <div
                style={{
                  position: 'absolute',
                  bottom: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  padding: '2px 10px',
                  height: 22,
                  borderRadius: 11,
                  fontSize: 11,
                  fontWeight: 700,
                  background: getLevelColor(profileUser.level.level),
                  border: '2px solid #fff',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}
              >
                {getLevelIcon(profileUser.level.level)}Lv{profileUser.level.level}
              </div>
            )}
          </div>

          <Title level={4} style={{ margin: '12px 0 4px 0', fontSize: 20 }}>
            <span className="food-gradient-title">
              {profileUser.username}
            </span>
            {isOwner && (
              <Space size={4} style={{ marginLeft: 8 }}>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={(file) => { void handleAvatarChange(file); return false; }}
                >
                  <Tooltip title="上传自定义头像">
                    <Button
                      icon={<UploadOutlined />}
                      size="small"
                      shape="circle"
                      style={{
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        background: 'linear-gradient(135deg, #ff6b35 0%, #ff8e53 100%)',
                        border: '2px solid #fff',
                        color: '#fff',
                      }}
                    />
                  </Tooltip>
                </Upload>
                <Tooltip title="选择预设头像">
                  <Button
                    icon={<SmileOutlined />}
                    size="small"
                    shape="circle"
                    onClick={handleOpenAvatarModal}
                    style={{
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      background: 'linear-gradient(135deg, #722ed1 0%, #b37feb 100%)',
                      border: '2px solid #fff',
                      color: '#fff',
                    }}
                  />
                </Tooltip>
              </Space>
            )}
          </Title>

          {/* 等级详情按钮 - 所有者点击可查看详情 */}
          {isOwner && levelInfo && levelInfo.currentLevel && !levelLoading && (
            <div style={{ marginBottom: 8 }}>
              <div
                onClick={() => setLevelCardOpen(true)}
                style={{ cursor: 'pointer', display: 'inline-block' }}
              >
                <LevelBadge
                  level={levelInfo.currentLevel}
                  exp={levelInfo.exp}
                  expToNextLevel={levelInfo.expToNextLevel}
                  showProgress
                  size="small"
                />
              </div>
            </div>
          )}

          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320, lineHeight: '1.4' }}
          >
            {profileUser.bio || '这个人很懒，什么都没写 ✨'}
          </Paragraph>

          {/* 统计徽章 */}
          <div className="profile-stats-row">
            <StatBadge type="posts" count={myPostsTotal} onClick={() => setActiveTab('posts')} />
            <StatBadge type="following" count={following.length} onClick={() => setActiveTab('following')} />
            <StatBadge type="followers" count={followers.length} onClick={() => setActiveTab('followers')} />
            {isOwner && <StatBadge type="friends" count={friendCount} onClick={() => setActiveTab('friends')} />}
            {isOwner && <StatBadge type="favorites" count={myFavorites.length} onClick={() => setActiveTab('favorites')} />}
            {isOwner && <StatBadge type="recommended" count={recommendedPosts.length} onClick={() => setActiveTab('recommended')} />}
          </div>

          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            📅 {new Date(profileUser.createdAt).toLocaleDateString('zh-CN')} 加入
          </Text>

          {/* 操作按钮 */}
          {!isOwner && profileUser && (
            <Space size={8} style={{ marginTop: 16 }} wrap className="profile-action-buttons">
              {/* 好友按钮 */}
              {isBlocked ? (
                <Button icon={<StopOutlined />} disabled style={{ borderRadius: 18, height: 36 }}>
                  已拉黑
                </Button>
              ) : isFriend ? (
                <Button icon={<CheckOutlined />} disabled style={{ borderRadius: 18, height: 36, background: '#f6ffed', borderColor: '#b7eb8f', color: '#52c41a' }}>
                  已是好友
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={handleAddFriend}
                  loading={friendLoading}
                  style={{
                    borderRadius: 18,
                    height: 36,
                    background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)'
                  }}
                >
                  添加好友
                </Button>
              )}
              {/* 私信按钮 */}
              {!isBlocked && (
                <Button
                  icon={<MessageOutlined />}
                  onClick={() => handleOpenChat(profileUser)}
                  style={{
                    borderRadius: 18,
                    height: 36,
                    fontWeight: 500,
                    background: 'linear-gradient(135deg, #ff6b35 0%, #ff8e53 100%)',
                    border: 'none',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
                  }}
                >
                  私信
                </Button>
              )}
              {/* 关注按钮 */}
              {!isBlocked && (
                <Button
                  icon={followStatus[profileUser.id] ? <CheckOutlined /> : <PlusOutlined />}
                  onClick={() => followStatus[profileUser.id] ? handleUnfollowUser(profileUser.id) : handleFollowUser(profileUser.id, profileUser)}
                  style={{
                    borderRadius: 18,
                    height: 36,
                    fontWeight: 500
                  }}
                >
                  {followStatus[profileUser.id] ? '已关注' : '关注'}
                </Button>
              )}
              {/* 拉黑按钮 */}
              {!isBlocked && (
                <Popconfirm
                  title="确定要拉黑该用户吗？"
                  description="拉黑后该用户无法给你发送私信"
                  onConfirm={handleBlockUser}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<StopOutlined />} style={{ borderRadius: 18, height: 36 }}>
                    拉黑
                  </Button>
                </Popconfirm>
              )}
              {/* 举报按钮 */}
              <Button
                icon={<WarningOutlined />}
                onClick={() => setReportModalOpen(true)}
                style={{ borderRadius: 18, height: 36 }}
              >
                举报
              </Button>
            </Space>
          )}

          {isOwner && (
            <Space size={8} style={{ marginTop: 16 }} wrap className="profile-action-buttons">
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  editForm.setFieldsValue({ username: profileUser.username, bio: profileUser.bio });
                  setEditModalOpen(true);
                }}
                style={{
                  borderRadius: 18,
                  height: 36,
                  fontWeight: 500
                }}
              >
                编辑资料
              </Button>
              <Button
                onClick={() => setPwdModalOpen(true)}
                style={{ borderRadius: 18, height: 36 }}
              >
                修改密码
              </Button>
              <Button
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                danger
                style={{ borderRadius: 18, height: 36 }}
              >
                退出登录
              </Button>
            </Space>
          )}
        </div>
      </Card>

      {/* 标签页 */}
      <Card
        className="food-tabs"
        style={{
          borderRadius: 14,
          boxShadow: '0 4px 16px rgba(255, 107, 53, 0.08)',
          border: '1px solid rgba(255, 107, 53, 0.1)'
        }}
        tabList={tabItems.map(item => ({ key: item.key, tab: item.label }))}
        activeTabKey={activeTab}
        onTabChange={setActiveTab}
      >
        {tabItems.find(item => item.key === activeTab)?.children}
      </Card>

      {/* 编辑资料弹窗 */}
      <Modal
        title="编辑资料"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        width={400}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditProfile} style={{ marginTop: 16 }}>
          <Form.Item label="用户名" name="username" rules={[{ required: true }, { min: 3, max: 20 }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item label="个人简介" name="bio">
            <TextArea rows={3} maxLength={200} showCount placeholder="介绍一下自己..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={editLoading} block size="large">
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={pwdModalOpen}
        onCancel={() => { setPwdModalOpen(false); pwdForm.resetFields(); }}
        footer={null}
        width={400}
      >
        <Form form={pwdForm} layout="vertical" onFinish={handleChangePassword} style={{ marginTop: 16 }}>
          <Form.Item label="当前密码" name="currentPassword" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item label="新密码" name="newPassword" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}>
            <Input.Password placeholder="请输入新密码（至少6位）" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              确认修改
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 选择预设头像弹窗 */}
      <Modal
        title="选择头像"
        open={avatarModalOpen}
        onCancel={() => setAvatarModalOpen(false)}
        footer={null}
        width={520}
      >
        <div style={{ padding: '16px 0' }}>
          {/* Tab 切换 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Button
              type={avatarTab === 'system' ? 'primary' : 'default'}
              onClick={() => setAvatarTab('system')}
              style={{ flex: 1, borderRadius: 8 }}
            >
              系统头像
            </Button>
            <Button
              type={avatarTab === 'custom' ? 'primary' : 'default'}
              onClick={() => setAvatarTab('custom')}
              style={{ flex: 1, borderRadius: 8 }}
            >
              我的头像 ({customAvatars.length}/20)
            </Button>
          </div>

          {avatarTab === 'system' ? (
            <>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                点击头像即可设置为自己的头像
              </Text>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12,
              }}>
                {defaultAvatars.map((avatar) => (
                  <div
                    key={avatar.id}
                    onClick={async () => {
                      try {
                        const updated = await setDefaultAvatar(avatar.id);
                        updateUser(updated);
                        setProfileUser(updated);
                        setAvatarModalOpen(false);
                        void message.success('头像已更新');
                      } catch {
                        void message.error('设置头像失败');
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 12,
                      padding: 8,
                      border: profileUser?.avatar?.includes(avatar.id) ? '2px solid #ff6b35' : '2px solid transparent',
                      background: profileUser?.avatar?.includes(avatar.id) ? '#fff7f3' : 'var(--bg-secondary)',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        marginBottom: 4,
                      }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {avatar.emoji}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  想用自定义头像？切换到「我的头像」标签上传
                </Text>
              </div>
            </>
          ) : (
            <>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                选择已保存的头像，或上传新头像到这里
              </Text>
              {/* 上传按钮 */}
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={async (file) => {
                  try {
                    const formData = new FormData();
                    formData.append('avatar', file);
                    await addCustomAvatar(formData);
                    const updated = await getCustomAvatars();
                    setCustomAvatars(updated || []);
                    void message.success('头像已保存到我的头像');
                  } catch (e: any) {
                    void message.error(e?.response?.data?.error || '保存头像失败');
                  }
                  return false;
                }}
              >
                <Button icon={<PlusOutlined />} style={{ marginBottom: 16, borderRadius: 8 }}>
                  上传新头像
                </Button>
              </Upload>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12,
                maxHeight: 300,
                overflowY: 'auto',
              }}>
                {customAvatars.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 24, color: '#999' }}>
                    暂无已保存的头像
                  </div>
                ) : (
                  customAvatars.map((avatar) => (
                    <div
                      key={avatar.id}
                      style={{
                        position: 'relative',
                        cursor: 'pointer',
                        borderRadius: 12,
                        padding: 8,
                        border: profileUser?.avatar === avatar.url ? '2px solid #ff6b35' : '2px solid transparent',
                        background: profileUser?.avatar === avatar.url ? '#fff7f3' : 'var(--bg-secondary)',
                        transition: 'all 0.2s',
                        textAlign: 'center',
                      }}
                    >
                      <img
                        src={avatar.url}
                        alt="自定义头像"
                        onClick={async () => {
                          try {
                            // 设置自定义头像为当前头像
                            const formData = new FormData();
                            // 创建一个虚拟文件来触发 updateAvatar
                            const res = await fetch(avatar.url);
                            const blob = await res.blob();
                            const file = new File([blob], 'avatar.webp', { type: 'image/webp' });
                            formData.append('avatar', file);
                            const updated = await updateAvatar(formData);
                            updateUser(updated);
                            setProfileUser(updated);
                            setAvatarModalOpen(false);
                            void message.success('头像已更新');
                          } catch {
                            void message.error('设置头像失败');
                          }
                        }}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          marginBottom: 4,
                        }}
                      />
                      <Popconfirm
                        title="删除此头像？"
                        onConfirm={async () => {
                          try {
                            await deleteCustomAvatar(avatar.id);
                            setCustomAvatars(prev => prev.filter(a => a.id !== avatar.id));
                            void message.success('已删除');
                          } catch {
                            void message.error('删除失败');
                          }
                        }}
                        okText="删除"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                          style={{ position: 'absolute', top: 2, right: 2, padding: 2, minWidth: 20 }}
                        />
                      </Popconfirm>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* 私信弹窗 */}
      {showChatModal && chatUser && (
        <ChatModal
          visible={showChatModal}
          onClose={() => setShowChatModal(false)}
          otherUser={chatUser}
        />
      )}

      {/* 举报弹窗 */}
      {profileUser && !isOwner && (
        <ReportModal
          open={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          reportedUserId={profileUser.id}
          reportedUsername={profileUser.username}
        />
      )}

      {/* 等级详情弹窗 */}
      <LevelCard
        visible={levelCardOpen}
        onClose={() => setLevelCardOpen(false)}
      />

      {/* 欢迎弹窗 */}
      <WelcomeModal
        open={welcomeVisible}
        onClose={() => setWelcomeVisible(false)}
      />

      <style>{`
        @media (max-width: 768px) {
          .profile-stats-row {
            flex-wrap: wrap !important;
            gap: 8px !important;
            justify-content: center !important;
          }
          .profile-action-buttons {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .profile-action-buttons .ant-btn {
            height: 36px !important;
            font-size: 13px !important;
            padding: 0 12px !important;
          }
        }
        @media (max-width: 480px) {
          .profile-avatar-section {
            padding: 0 12px !important;
          }
          .profile-action-buttons .ant-btn {
            height: 32px !important;
            font-size: 12px !important;
            padding: 0 8px !important;
          }
        }
      `}</style>
    </PageLayout>
  );
}
