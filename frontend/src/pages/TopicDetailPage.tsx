import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Row, Col, Card, Typography, Space, Empty, Button, Skeleton, message } from 'antd';
import { ArrowLeftOutlined, FireOutlined, TeamOutlined } from '@ant-design/icons';
import { getTopic, getTopicPosts, toggleFollowTopic, type Topic, type TopicRankingItem } from '../api/topic';
import { getHotTopics } from '../api/topic';
import PostCard from '../components/PostCard';
import FoodBackground from '../components/FoodBackground';
import { useScreenSize } from '../hooks/useScreenSize';
import { useAuthStore } from '../store/auth';
import type { Post } from '../types';
import '../styles/urbanInteractions.css';

const { Title, Text } = Typography;
const PAGE_SIZE = 12;

// 获取返回路径
const getBackPath = (from: string | null): string => {
  if (from === 'profile') {
    return '/profile';
  }
  return '/topics';
};

// 返回按钮 Props 类型
interface BackButtonProps {
  from: string | null;
  label?: string;
}

const BackButton = ({ from, label }: BackButtonProps) => {
  const navigate = useNavigate();
  const backPath = getBackPath(from);

  return (
    <Button
      type="text"
      icon={<ArrowLeftOutlined />}
      onClick={() => navigate(backPath)}
      style={{
        position: 'fixed',
        top: 70,
        left: 16,
        zIndex: 1000,
        marginBottom: 0,
        color: 'var(--text-secondary)',
      }}
    >
      {label || (from === 'profile' ? '返回个人主页' : '返回话题广场')}
    </Button>
  );
};

// 话题图标映射（复用TopicsSquarePage的逻辑）
const TOPIC_ICONS: Record<string, string> = {
  '川菜': '🌶️', '粤菜': '🥘', '湘菜': '🔥', '鲁菜': '🥢', '苏菜': '🍳',
  '浙菜': '🍜', '闽菜': '🦐', '徽菜': '🍲', '火锅': '🍲', '烧烤': '🍖',
  '小吃': '🍡', '甜点': '🍰', '饮品': '🧃', '早餐': '🥚', '夜宵': '🌙',
  '面食': '🍝', '海鲜': '🦀', '日料': '🍣', '韩料': '🥙', '西餐': '🥩',
  '咖啡': '☕', '奶茶': '🧋', '默认': '🏷️',
};

const getTopicIcon = (name: string): string => {
  const lowerName = name.toLowerCase();
  for (const [key, icon] of Object.entries(TOPIC_ICONS)) {
    if (lowerName.includes(key.toLowerCase())) {
      return icon;
    }
  }
  return TOPIC_ICONS['默认'];
};

// 加载骨架屏
const PostSkeleton = () => (
  <Col xs={24} sm={12} md={8} lg={6}>
    <div className="post-card-urban" style={{ height: 480 }}>
      <div className="post-image-container">
        <div className="skeleton-shimmer" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="post-content-area">
        <div className="skeleton-shimmer" style={{ height: 20, width: '90%', marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ height: 20, width: '70%', marginBottom: 16 }} />
        <div className="skeleton-shimmer" style={{ height: 32, width: 80, borderRadius: 16 }} />
      </div>
    </div>
  </Col>
);

export default function TopicDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const screenSize = useScreenSize();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const from = searchParams.get('from');

  const [topic, setTopic] = useState<Topic | null>(null);
  const [relatedTopics, setRelatedTopics] = useState<TopicRankingItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);

  const decodedName = name ? decodeURIComponent(name) : '';

  useEffect(() => {
    if (decodedName) {
      fetchTopicData();
    }
  }, [decodedName]);

  const fetchTopicData = async () => {
    try {
      setLoading(true);
      const [topicData, postsData, relatedData] = await Promise.all([
        getTopic(decodedName),
        getTopicPosts(decodedName, { page: 1, pageSize: PAGE_SIZE }),
        getHotTopics({ limit: 10 }),
      ]);

      setTopic(topicData || null);
      setFollowing(topicData?.isFollowing || false);
      setPosts(postsData?.data || []);
      setTotalPosts(postsData?.pagination?.total || 0);
      setHasMore(postsData?.pagination?.page < postsData?.pagination?.totalPages);

      // 过滤掉当前话题
      setRelatedTopics((relatedData || []).filter(t => t.name !== decodedName).slice(0, 6));
    } catch (error) {
      console.error('获取话题数据失败:', error);
      message.error('加载话题失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async (page: number) => {
    try {
      setLoadingMore(true);
      const data = await getTopicPosts(decodedName, { page, pageSize: PAGE_SIZE });
      const newPosts = data?.data || [];
      setPosts(prev => page === 1 ? newPosts : [...prev, ...newPosts]);
      setTotalPosts(data?.pagination?.total || 0);
      setHasMore(data?.pagination?.page < data?.pagination?.totalPages);
      setCurrentPage(page);
    } catch (error) {
      console.error('加载更多动态失败:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadMorePosts(currentPage + 1);
    }
  }, [loadingMore, hasMore, currentPage]);

  const handleFollow = async () => {
    if (!isLoggedIn) {
      message.info('请先登录');
      navigate('/login');
      return;
    }

    if (!topic) return;

    setFollowLoading(true);
    try {
      const result = await toggleFollowTopic(topic.id, following);
      setFollowing(result.following);
      setTopic(prev => prev ? {
        ...prev,
        isFollowing: result.following,
        followCount: result.followCount,
      } : null);
      message.success(result.following ? '关注成功' : '已取消关注');
    } catch (error) {
      console.error('关注话题失败:', error);
      message.error('操作失败');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUpdate = (updated: Partial<Post> & { id: number }) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  };

  const handleRelatedTopicClick = (topicName: string) => {
    navigate(`/topic/${encodeURIComponent(topicName)}?from=${from || 'topics'}`);
  };

  // 骨架屏
  if (loading) {
    return (
      <div style={{ padding: '16px 0 80px', minHeight: '60vh' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          {/* 返回按钮 - 固定在页面左上角 */}
          <BackButton from={from} />

          {/* 话题头部骨架 */}
          <Card style={{ marginBottom: 24, borderRadius: 16, marginTop: 48 }}>
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Skeleton.Avatar size={80} active style={{ marginBottom: 16 }} />
              <Skeleton active paragraph={{ rows: 1 }} style={{ maxWidth: 300, margin: '0 auto' }} />
            </div>
          </Card>

          {/* 动态列表骨架 */}
          <Row gutter={[screenSize.isSmallMobile ? 12 : 16, screenSize.isSmallMobile ? 12 : 16]}>
            {[1, 2, 3, 4, 5, 6].map(i => <PostSkeleton key={i} />)}
          </Row>
        </div>
      </div>
    );
  }

  // 话题不存在
  if (!topic) {
    return (
      <div style={{ padding: '16px 0 80px', minHeight: '60vh' }}>
        {/* 返回按钮 - 固定在页面左上角 */}
        <BackButton from={from} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', marginTop: 48 }}>
          <Card style={{ textAlign: 'center', padding: 60, borderRadius: 16 }}>
            <Empty
              imageStyle={{ height: 80 }}
              description={
                <Space direction="vertical" style={{ gap: 12 }}>
                  <Text style={{ fontSize: 16 }}>话题不存在</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    该话题可能已被删除或不存在
                  </Text>
                  <Button type="primary" onClick={() => navigate('/topics')}>
                    返回话题广场
                  </Button>
                </Space>
              }
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0 80px', minHeight: '80vh', position: 'relative', overflow: 'hidden' }}>
      {/* 美食背景 */}
      <FoodBackground count={screenSize.isMobile ? 8 : 12} minSize={screenSize.isSmallMobile ? 16 : 20} maxSize={screenSize.isSmallMobile ? 32 : 40} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', position: 'relative', zIndex: 1 }}>
        {/* 返回按钮 - 固定在页面左上角 */}
        <BackButton from={from} />

        {/* 话题头部信息 */}
        <Card
          style={{
            marginBottom: 24,
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(255, 77, 79, 0.04) 100%)',
            border: '1px solid rgba(255, 107, 53, 0.15)',
          }}
          bodyStyle={{ padding: 32 }}
        >
          <div style={{ textAlign: 'center' }}>
            {/* 话题图标 */}
            <div style={{
              fontSize: 72,
              marginBottom: 16,
              filter: 'drop-shadow(0 4px 8px rgba(255, 107, 53, 0.2))',
            }}>
              {getTopicIcon(topic.name)}
            </div>

            {/* 话题名称 */}
            <Title level={2} style={{
              margin: '0 0 8px',
              background: 'linear-gradient(135deg, #ff6b35 0%, #ff4d4f 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              #{topic.name}
            </Title>

            {/* 话题描述 */}
            {topic.description && (
              <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 16 }}>
                {topic.description}
              </Text>
            )}

            {/* 统计数据 */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 32,
              marginBottom: 20,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <FireOutlined style={{ color: '#ff4d4f' }} />
                  <Text strong style={{ fontSize: 20, color: 'var(--text-primary)' }}>
                    {topic.postCount}
                  </Text>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>动态</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <TeamOutlined style={{ color: '#ff6b35' }} />
                  <Text strong style={{ fontSize: 20, color: 'var(--text-primary)' }}>
                    {topic.followCount || 0}
                  </Text>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>关注</Text>
              </div>
            </div>

            {/* 关注按钮 */}
            {isLoggedIn && (
              <Button
                type={following ? 'default' : 'primary'}
                danger={following}
                onClick={handleFollow}
                loading={followLoading}
                style={{
                  borderRadius: 20,
                  height: 40,
                  paddingLeft: 28,
                  paddingRight: 28,
                  fontWeight: 600,
                  ...(following ? {} : {
                    background: 'linear-gradient(135deg, #ff6b35 0%, #ff4d4f 100%)',
                    border: 'none',
                  }),
                }}
              >
                {following ? '已关注' : '+ 关注话题'}
              </Button>
            )}
          </div>
        </Card>

        {/* 相关话题 */}
        {relatedTopics.length > 0 && (
          <Card
            style={{
              marginBottom: 24,
              borderRadius: 16,
            }}
            bodyStyle={{ padding: 16 }}
          >
            <Text strong style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12, display: 'block' }}>
              相关话题
            </Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {relatedTopics.map(t => (
                <Button
                  key={t.id}
                  type="text"
                  size="small"
                  onClick={() => handleRelatedTopicClick(t.name)}
                  style={{
                    borderRadius: 16,
                    background: 'rgba(255, 107, 53, 0.08)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                  }}
                >
                  {getTopicIcon(t.name)} {t.name}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* 动态列表 */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 16, display: 'block' }}>
            话题动态 ({totalPosts})
          </Text>

          {posts.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 60, borderRadius: 16 }}>
              <Empty
                imageStyle={{ height: 80 }}
                description={
                  <Space direction="vertical" style={{ gap: 12 }}>
                    <Text style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
                      暂无动态
                    </Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      成为第一个分享这个话题美食的人吧！
                    </Text>
                  </Space>
                }
              />
            </Card>
          ) : (
            <>
              {/* 动态列表 */}
              <div className={`posts-grid stagger-fade-in delay-3`}>
                {posts.map((post, index) => (
                  <div
                    key={post.id}
                    className={`stagger-fade-in delay-${Math.min(index + 1, 8)}`}
                  >
                    <PostCard post={post} from={`/topic/${name}`} onUpdate={handleUpdate} />
                  </div>
                ))}
              </div>

              {/* 加载更多 */}
              {hasMore && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Button
                    onClick={handleLoadMore}
                    loading={loadingMore}
                    size="large"
                    style={{
                      minWidth: 160,
                      borderRadius: 20,
                      height: 44,
                      background: 'linear-gradient(135deg, #ff6b35 0%, #ff4d4f 100%)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  >
                    {loadingMore ? '加载中...' : '加载更多'}
                  </Button>
                </div>
              )}

              {/* 加载完毕 */}
              {!hasMore && posts.length > 0 && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    已展示全部 {totalPosts} 条动态
                  </Text>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}