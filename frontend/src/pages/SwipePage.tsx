import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Empty, message, Button, Avatar, Typography, Space, Tooltip } from 'antd';
import { HeartFilled, HeartOutlined, StarFilled, StarOutlined, EnvironmentOutlined, UserOutlined, PlusOutlined, CheckOutlined, MessageOutlined, CloseOutlined, ShareAltOutlined, EyeOutlined, CaretUpFilled, CaretDownFilled } from '@ant-design/icons';
import { getRandomPosts } from '../api/post';
import { toggleLike, toggleFavorite } from '../api/post';
import { followUser, unfollowUser, checkFollowStatus } from '../api/follow';
import { useAuthStore } from '../store/auth';
import PostDetailModal from '../components/PostDetailModal';
import ChatModal from '../components/ChatModal';
import FoodBackground from '../components/FoodBackground';
import { getAnimationStyle, getRandomFoods } from '../utils/foodAnimations';
import type { Post } from '../types';

const { Text, Paragraph } = Typography;

// 手势相关类型
type TouchDirection = 'up' | 'down' | null;
type SwipeState = 'touching' | 'none';

interface Props {
  initialPostId?: number;
}

export default function SwipePage({ initialPostId: _initialPostId }: Props) {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const currentUser = useAuthStore((s) => s.user);

  const [posts, setPosts] = useState<Post[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingNext, setLoadingNext] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [chatUser, setChatUser] = useState<Post['user'] | null>(null);
  const [showChat, setShowChat] = useState(false);

  // 手势相关状态
  const [swipeState, setSwipeState] = useState<SwipeState>('none');
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchCurrent, setTouchCurrent] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState<TouchDirection>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 加载随机动态（不排除任何ID，始终随机）
  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await getRandomPosts({ limit: 10 });
      if (data.data.length === 0) {
        void message.info('暂无内容');
        navigate('/');
        return;
      }
      setPosts(data.data);
      setCurrentIndex(0);
    } catch (error) {
      void message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadPosts();
  }, []);

  // 加载下一个随机动态（向下滑动时）
  const loadNextRandom = useCallback(async () => {
    if (loadingNext) return;
    setLoadingNext(true);

    try {
      // 不排除任何ID，始终随机获取
      const data = await getRandomPosts({ limit: 1 });

      if (data.data.length > 0) {
        const newPost = data.data[0];
        // 直接在数组末尾添加新动态
        setPosts((prev) => [...prev, newPost]);
      } else {
        void message.warning('暂时没有更多内容了');
      }
    } catch (error) {
      void message.error('加载失败');
    } finally {
      setLoadingNext(false);
    }
  }, [loadingNext]);

  const currentPost = posts[currentIndex];

  // 处理点赞
  const handleLike = async () => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      navigate('/login');
      return;
    }
    if (!currentPost) return;

    try {
      const res = await toggleLike(currentPost.id);
      setPosts((prev) =>
        prev.map((p, i) =>
          i === currentIndex ? { ...p, isLiked: res.liked, likeCount: res.likeCount } : p
        )
      );
    } catch {
      void message.error('操作失败');
    }
  };

  // 处理收藏
  const handleFavorite = async () => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      navigate('/login');
      return;
    }
    if (!currentPost) return;

    try {
      const res = await toggleFavorite(currentPost.id);
      setPosts((prev) =>
        prev.map((p, i) =>
          i === currentIndex ? { ...p, isFavorited: res.favorited, favoriteCount: res.favoriteCount } : p
        )
      );
    } catch {
      void message.error('操作失败');
    }
  };

  // 处理关注
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (currentPost && isLoggedIn) {
      checkFollowStatus(currentPost.user.id).then((result) => {
        setIsFollowing(result.isFollowing);
      }).catch(() => {});
    }
  }, [currentPost, isLoggedIn]);

  const handleFollow = async () => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }
    if (!currentPost) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(currentPost.user.id);
        setIsFollowing(false);
        void message.success('已取消关注');
      } else {
        await followUser(currentPost.user.id);
        setIsFollowing(true);
        void message.success('关注成功');
      }
    } catch {
      void message.error('操作失败');
    } finally {
      setFollowLoading(false);
    }
  };

  // 处理私信
  const handleMessage = () => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }
    if (!currentPost) return;
    setChatUser(currentPost.user);
    setShowChat(true);
  };

  // 向上滑动 - 看之前的（列表中的下一个）
  const goUp = useCallback(() => {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, posts.length]);

  // 向下滑动 - 加载新的随机动态
  const goDown = useCallback(() => {
    // 先加载新动态
    loadNextRandom();
    // 然后移动到下一个
    setTimeout(() => {
      setCurrentIndex((prev) => {
        // 确保不会超出范围
        if (prev < posts.length) {
          return prev + 1;
        }
        return prev;
      });
    }, 100);
  }, [loadNextRandom, posts.length]);

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchCurrent({ x: touch.clientX, y: touch.clientY });
    setSwipeState('touching');
    setDirection(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipeState !== 'touching') return;

    const touch = e.touches[0];
    setTouchCurrent({ x: touch.clientX, y: touch.clientY });

    const diffX = touch.clientX - touchStart.x;
    const diffY = touch.clientY - touchStart.y;

    // 判断滑动方向（只关心垂直滑动）
    if (Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY > 10) {
        setDirection('down');
      } else if (diffY < -10) {
        setDirection('up');
      }
    }
  };

  const handleTouchEnd = () => {
    if (swipeState !== 'touching') return;

    const diffY = touchCurrent.y - touchStart.y;

    // 向上滑动（手指向上移）- 看之前的
    if (diffY < -50 && direction === 'up') {
      goUp();
    }
    // 向下滑动（手指向下移）- 加载新的
    else if (diffY > 50 && direction === 'down') {
      goDown();
    }

    setSwipeState('none');
    setDirection(null);
  };

  // 鼠标滚轮支持（桌面端）
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    // 控制滚动速度
    if (Math.abs(e.deltaY) < 30) return;

    if (e.deltaY < 0) {
      // 向上滚动，看之前的
      goUp();
    } else {
      // 向下滚动，加载新的
      goDown();
    }
  }, [goUp, goDown]);

  // 注册滚轮事件
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleWheel]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Space direction="vertical" size={20} style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <Text style={{ color: '#fff', fontSize: 16 }}>加载精彩内容中...</Text>
        </Space>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Empty description="暂无内容" style={{ color: '#fff' }} />
      </div>
    );
  }

  if (!currentPost) return null;

  const liked = currentPost.isLiked ?? false;
  const favorited = currentPost.isFavorited ?? false;
  const hasMoreUp = currentIndex < posts.length - 1;

  return (
    <>
      <div
        ref={containerRef}
        style={{
          height: '100vh',
          width: '100vw',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#1a1a1a',
          touchAction: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 美食背景 */}
        <FoodBackground count={15} minSize={20} maxSize={40} />

        {/* 边缘美食装饰 */}
        {getRandomFoods(6).map((food, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              fontSize: 28,
              opacity: 0.3,
              left: i % 2 === 0 ? '20px' : 'auto',
              right: i % 2 === 1 ? '20px' : 'auto',
              top: `${15 + i * 15}%`,
              pointerEvents: 'none',
              ...getAnimationStyle('pulse', 2 + i * 0.3, i * 0.2),
            }}
          >
            {food}
          </div>
        ))}
        {/* 背景图片（模糊效果） */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${currentPost.images[0]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px)',
            opacity: 0.3,
            zIndex: 0,
          }}
        />

        {/* 顶部导航栏 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
        }}>
          <Button
            type="text"
            icon={<CloseOutlined style={{ color: '#fff', fontSize: 18 }} />}
            onClick={() => navigate('/')}
            style={{ border: 'none', color: '#fff' }}
          />
          <div style={{
            padding: '6px 16px',
            borderRadius: 20,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
              随机推荐
            </Text>
          </div>
          <Button
            type="text"
            icon={<ShareAltOutlined style={{ color: '#fff', fontSize: 18 }} />}
            onClick={() => setShowDetailModal(true)}
            style={{ border: 'none', color: '#fff' }}
          />
        </div>

        {/* 主内容区域 */}
        <div style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* 图片 */}
          <div
            style={{
              flex: 1,
              width: '100%',
              maxWidth: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 90px 180px',
            }}
          >
            <img
              src={currentPost.images[0]}
              alt="post"
              style={{
                maxWidth: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: 16,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
              }}
              onClick={() => setShowDetailModal(true)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
          </div>

          {/* 底部信息卡片 */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '20px 24px 32px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* 用户信息 */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <Avatar
                src={currentPost.user.avatar}
                icon={<UserOutlined />}
                size={48}
                style={{
                  marginRight: 12,
                  border: '3px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  cursor: 'pointer'
                }}
                onClick={() => navigate(`/profile?userId=${currentPost.user.id}`)}
              />
              <div style={{ flex: 1 }}>
                <Text
                  strong
                  style={{
                    color: '#fff',
                    fontSize: 16,
                    cursor: 'pointer',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}
                  onClick={() => navigate(`/profile?userId=${currentPost.user.id}`)}
                >
                  {currentPost.user.username}
                </Text>
                {currentPost.address && (
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                    <EnvironmentOutlined style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginRight: 6 }} />
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                      {currentPost.address.length > 25
                        ? currentPost.address.substring(0, 25) + '...'
                        : currentPost.address}
                    </Text>
                  </div>
                )}
              </div>
              {isLoggedIn && currentPost.user.id !== currentUser?.id && (
                <Button
                  type={isFollowing ? 'default' : 'primary'}
                  size="middle"
                  icon={isFollowing ? <CheckOutlined /> : <PlusOutlined />}
                  onClick={handleFollow}
                  loading={followLoading}
                  style={{
                    borderRadius: 24,
                    height: 38,
                    paddingLeft: 16,
                    paddingRight: 16,
                    fontWeight: 500,
                    background: isFollowing
                      ? 'rgba(255,255,255,0.15)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: isFollowing ? '1px solid rgba(255,255,255,0.3)' : 'none',
                    color: '#fff',
                  }}
                >
                  {isFollowing ? '已关注' : '关注'}
                </Button>
              )}
            </div>

            {/* 内容 */}
            <Paragraph
              ellipsis={{ rows: 2, expandable: false }}
              style={{
                color: '#fff',
                fontSize: 15,
                lineHeight: '1.7',
                marginBottom: 20,
                minHeight: 48,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {currentPost.content}
            </Paragraph>

            {/* 右侧操作按钮 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              marginBottom: 16,
            }}>
              <Tooltip title={liked ? '取消点赞' : '点赞'}>
                <div
                  onClick={handleLike}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: liked
                      ? 'linear-gradient(135deg, #ff6b6b, #ff4757)'
                      : 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    marginBottom: 4,
                  }}>
                    {liked ? (
                      <HeartFilled style={{ color: '#fff', fontSize: 22 }} />
                    ) : (
                      <HeartOutlined style={{ color: '#fff', fontSize: 22 }} />
                    )}
                  </div>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>
                    {currentPost.likeCount > 0 ? currentPost.likeCount.toLocaleString() : '点赞'}
                  </Text>
                </div>
              </Tooltip>

              <Tooltip title={favorited ? '取消收藏' : '收藏'}>
                <div
                  onClick={handleFavorite}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: favorited
                      ? 'linear-gradient(135deg, #feca57, #ff9f43)'
                      : 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    marginBottom: 4,
                  }}>
                    {favorited ? (
                      <StarFilled style={{ color: '#fff', fontSize: 20 }} />
                    ) : (
                      <StarOutlined style={{ color: '#fff', fontSize: 20 }} />
                    )}
                  </div>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>
                    {currentPost.favoriteCount > 0 ? currentPost.favoriteCount.toLocaleString() : '收藏'}
                  </Text>
                </div>
              </Tooltip>

              {isLoggedIn && currentPost.user.id !== currentUser?.id && (
                <Tooltip title="发送私信">
                  <div
                    onClick={handleMessage}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      marginBottom: 4,
                    }}>
                      <MessageOutlined style={{ color: '#fff', fontSize: 20 }} />
                    </div>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>
                      私信
                    </Text>
                  </div>
                </Tooltip>
              )}

              <Tooltip title="查看详情">
                <div
                  onClick={() => setShowDetailModal(true)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    marginBottom: 4,
                  }}>
                    <EyeOutlined style={{ color: '#fff', fontSize: 20 }} />
                  </div>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>
                    详情
                  </Text>
                </div>
              </Tooltip>
            </div>

            {/* 滑动提示 */}
            <div style={{
              textAlign: 'center',
              animation: 'slideHint 2s ease-in-out infinite',
            }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                {hasMoreUp ? '👆 上滑查看之前的内容 | 下滑发现更多' : '👇 下滑发现更多精彩'}
              </Text>
            </div>
          </div>
        </div>

        {/* 右侧导航按钮 */}
        <div style={{
          position: 'fixed',
          right: 24,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {/* 向上按钮 - 看之前的 */}
          <Tooltip title="上一个 (↑) - 查看之前的内容" placement="left">
            <div
              onClick={goUp}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: hasMoreUp ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                border: hasMoreUp ? '2px solid rgba(255,255,255,0.5)' : '2px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: hasMoreUp ? 1 : 0.4,
                cursor: hasMoreUp ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                pointerEvents: 'auto',
              }}
              onMouseEnter={(e) => {
                if (hasMoreUp) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.35)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                if (hasMoreUp) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                }
              }}
            >
              <CaretUpFilled style={{ fontSize: 26, color: hasMoreUp ? '#fff' : 'rgba(255,255,255,0.3)' }} />
            </div>
          </Tooltip>

          {/* 向下按钮 - 加载新的 */}
          <Tooltip title="下一个 (↓) - 发现更多精彩" placement="left">
            <div
              onClick={loadingNext ? undefined : goDown}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: loadingNext ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)',
                border: loadingNext ? '2px solid rgba(255,255,255,0.15)' : '2px solid rgba(255,255,255,0.5)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loadingNext ? 0.4 : 1,
                cursor: loadingNext ? 'wait' : 'pointer',
                transition: 'all 0.3s ease',
                pointerEvents: 'auto',
              }}
              onMouseEnter={(e) => {
                if (!loadingNext) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.35)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                if (!loadingNext) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                }
              }}
            >
              {loadingNext ? (
                <Spin size="small" />
              ) : (
                <CaretDownFilled style={{ fontSize: 26, color: '#fff' }} />
              )}
            </div>
          </Tooltip>
        </div>

        {/* 加载指示器 */}
        {loadingNext && (
          <div style={{
            position: 'absolute',
            bottom: 200,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            padding: '16px 24px',
            borderRadius: 30,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
          }}>
            <Space size={12}>
              <Spin size="small" />
              <Text style={{ color: '#fff', fontSize: 14 }}>发现新内容中...</Text>
            </Space>
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {showDetailModal && (
        <PostDetailModal
          postId={currentPost.id}
          visible={showDetailModal}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* 私信弹窗 */}
      {showChat && chatUser && (
        <ChatModal
          visible={showChat}
          onClose={() => setShowChat(false)}
          otherUser={chatUser}
        />
      )}

      <style>{`
        @keyframes slideHint {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
