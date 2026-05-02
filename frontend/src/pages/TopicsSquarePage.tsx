import { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Space, Empty, Skeleton, Tag as AntTag, Input, Modal, Form, Button, message, Tabs, Tooltip } from 'antd';
import { FireOutlined, SearchOutlined, TrophyOutlined, RiseOutlined, PlusOutlined, StarOutlined } from '@ant-design/icons';
import { getHotTopics, getTopicCategories, searchTopics, getUserFollowedTopics, type TopicRankingItem, type TopicCategory } from '../api/topic';
import { getMyLevelInfo } from '../api/level';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import FoodBackground from '../components/FoodBackground';
import { useScreenSize } from '../hooks/useScreenSize';
import { useAuthStore } from '../store/auth';
import '../styles/urbanInteractions.css';

const { Title, Text } = Typography;
const { Search } = Input;

// 话题图标映射
const TOPIC_ICONS: Record<string, string> = {
  '川菜': '🌶️',
  '粤菜': '🥘',
  '湘菜': '🔥',
  '鲁菜': '🥢',
  '苏菜': '🍳',
  '浙菜': '🍜',
  '闽菜': '🦐',
  '徽菜': '🍲',
  '火锅': '🍲',
  '烧烤': '🍖',
  '小吃': '🍡',
  '甜点': '🍰',
  '饮品': '🧃',
  '早餐': '🥚',
  '夜宵': '🌙',
  '面食': '🍝',
  '海鲜': '🦀',
  '日料': '🍣',
  '韩料': '🥙',
  '西餐': '🥩',
  '咖啡': '☕',
  '奶茶': '🧋',
  '默认': '🏷️',
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
const TopicSkeleton = () => (
  <Col xs={12} sm={8} md={6} lg={4}>
    <Card
      style={{
        borderRadius: 16,
        textAlign: 'center',
        height: 160,
      }}
      bodyStyle={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
    >
      <Skeleton.Avatar active size={48} style={{ margin: '0 auto 12px' }} />
      <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} style={{ margin: '0 auto' }} />
    </Card>
  </Col>
);

export default function TopicsSquarePage() {
  const navigate = useNavigate();
  const screenSize = useScreenSize();
  const { isLoggedIn } = useAuthStore();
  const [topics, setTopics] = useState<TopicRankingItem[]>([]);
  const [categories, setCategories] = useState<TopicCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'hot' | 'new' | 'following'>('hot');
  const [userLevel, setUserLevel] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, [selectedCategory, activeTab]);

  // 获取用户等级信息
  useEffect(() => {
    if (isLoggedIn) {
      getMyLevelInfo()
        .then((data) => {
          setUserLevel(data?.currentLevel?.level || 0);
        })
        .catch(() => {
          setUserLevel(0);
        });
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'following') {
        const followedData = await getUserFollowedTopics();
        setTopics(followedData?.data || []);
      } else {
        const [topicsData, categoriesData] = await Promise.all([
          getHotTopics({ limit: 50, category: selectedCategory }),
          getTopicCategories(),
        ]);
        setTopics(topicsData || []);
        setCategories(categoriesData || []);
      }
    } catch (error) {
      console.error('获取话题数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤话题
  const filteredTopics = topics.filter(topic =>
    !searchKeyword || topic.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // 搜索话题（调用后端API）
  const handleSearchTopic = async (keyword: string) => {
    try {
      setLoading(true);
      const results = await searchTopics(keyword, { limit: 50 });
      setTopics(results || []);
    } catch (error) {
      console.error('搜索话题失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索输入处理
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchKeyword(value);
    if (value.trim()) {
      handleSearchTopic(value);
    }
  };

  // 跳转到话题详情
  const handleTopicClick = (topicName: string) => {
    navigate(`/topic/${encodeURIComponent(topicName)}?from=topics`);
  };

  // 打开创建话题弹窗
  const handleOpenCreateModal = () => {
    if (!isLoggedIn) {
      message.warning('请先登录');
      return;
    }
    if (userLevel < 4) {
      message.warning(`创建话题需要达到 Lv4 美食专家，当前等级为 Lv${userLevel || 1}`);
      return;
    }
    createForm.resetFields();
    setCreateModalVisible(true);
  };

  // 创建话题
  const handleCreateTopic = async (values: { name: string }) => {
    try {
      setCreating(true);
      await api.post('/topics', { name: values.name });
      message.success('话题创建成功');
      setCreateModalVisible(false);
      fetchData();
    } catch (error) {
      console.error('创建话题失败:', error);
      message.error('创建话题失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  // 获取排名样式
  const getRankStyle = (rank: number): React.CSSProperties => {
    if (rank === 1) return { color: '#FFD700', fontSize: 18, fontWeight: 800 };
    if (rank === 2) return { color: '#C0C0C0', fontSize: 16, fontWeight: 700 };
    if (rank === 3) return { color: '#CD7F32', fontSize: 14, fontWeight: 600 };
    return { color: 'var(--text-tertiary)', fontSize: 12 };
  };

  // 骨架屏
  if (loading) {
    return (
      <div style={{ padding: '16px 0 80px', minHeight: '60vh' }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
            <TrophyOutlined style={{ fontSize: 32, color: '#ff6b35' }} />
            <Title level={2} style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
              话题广场
            </Title>
            <FireOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
          </div>
          <Text type="secondary">加载精彩话题中...</Text>
        </div>
        <Row gutter={[screenSize.isSmallMobile ? 12 : 16, screenSize.isSmallMobile ? 12 : 16]}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <TopicSkeleton key={i} />)}
        </Row>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0 80px', minHeight: '80vh', position: 'relative', overflow: 'hidden' }}>
      {/* 美食背景 */}
      <FoodBackground count={screenSize.isMobile ? 10 : 15} minSize={screenSize.isSmallMobile ? 16 : 22} maxSize={screenSize.isSmallMobile ? 32 : 45} />

      {/* 页面内容 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', position: 'relative', zIndex: 1 }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
            <TrophyOutlined style={{ fontSize: 36, color: '#ff6b35' }} />
            <Title level={1} style={{
              margin: 0,
              fontSize: 36,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ff6b35 0%, #ff4d4f 50%, #ff9800 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              话题广场
            </Title>
            <FireOutlined style={{ fontSize: 36, color: '#ff4d4f' }} />
          </div>
          <Text type="secondary" style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
            发现最热门的话题，找到志同道合的美食爱好者
          </Text>
        </div>

        {/* Tab切换 */}
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'hot' | 'new' | 'following')}
          style={{ marginBottom: 16 }}
          items={[
            {
              key: 'hot',
              label: (
                <span>
                  <FireOutlined /> 热门
                </span>
              ),
            },
            {
              key: 'new',
              label: (
                <span>
                  <RiseOutlined /> 最新
                </span>
              ),
            },
            {
              key: 'following',
              label: (
                <span>
                  <StarOutlined /> 关注
                </span>
              ),
            },
          ]}
        />

        {/* 搜索和筛选 */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 24,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* 分类筛选 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AntTag
              color={selectedCategory === '' ? 'orange' : 'default'}
              style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 16, fontSize: 13 }}
              onClick={() => setSelectedCategory('')}
            >
              全部
            </AntTag>
            {categories.map(cat => (
              <AntTag
                key={cat.id}
                color={selectedCategory === cat.name ? 'orange' : 'default'}
                style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 16, fontSize: 13 }}
                onClick={() => setSelectedCategory(cat.name)}
              >
                {cat.icon} {cat.name} ({cat.count})
              </AntTag>
            ))}
          </div>

          {/* 搜索框 */}
          <Search
            placeholder="搜索话题..."
            allowClear
            prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
            style={{ width: screenSize.isMobile ? '100%' : 200 }}
            value={searchKeyword}
            onChange={handleSearchChange}
          />

          {/* 创建话题按钮 */}
          {isLoggedIn && userLevel >= 4 ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateModal}
              style={{ borderRadius: 8 }}
            >
              {screenSize.isMobile ? '' : '创建话题'}
            </Button>
          ) : (
            <Tooltip title={isLoggedIn ? `创建话题需要 Lv4 美食专家（当前 Lv${userLevel || 1}）` : '请先登录'}>
              <Button
                type="default"
                icon={<PlusOutlined />}
                disabled
                style={{ borderRadius: 8, opacity: 0.6 }}
              >
                {screenSize.isMobile ? '' : '创建话题'}
              </Button>
            </Tooltip>
          )}
        </div>

        {/* 热门话题排行 */}
        <div style={{
          marginBottom: 32,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
          }}>
            <RiseOutlined style={{ color: '#ff6b35', fontSize: 20 }} />
            <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>
              热门话题排行榜
            </Title>
          </div>

          {/* 空状态 */}
          {filteredTopics.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 40, borderRadius: 16 }}>
              <Empty
                imageStyle={{ height: 80 }}
                description={
                  <Space direction="vertical" style={{ gap: 8 }}>
                    <Text style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
                      {searchKeyword ? '未找到相关话题' : '暂无话题'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {searchKeyword ? '试试其他关键词' : '快成为第一个创建话题的人吧！'}
                    </Text>
                  </Space>
                }
              />
            </Card>
          ) : (
            <Row gutter={[screenSize.isSmallMobile ? 12 : 16, screenSize.isSmallMobile ? 12 : 16]}>
              {filteredTopics.map((topic, index) => (
                <Col
                  key={topic.id}
                  xs={12}
                  sm={8}
                  md={6}
                  lg={4}
                  className={`stagger-fade-in delay-${Math.min(index + 1, 8)}`}
                >
                  <Card
                    hoverable
                    onClick={() => handleTopicClick(topic.name)}
                    style={{
                      borderRadius: 16,
                      textAlign: 'center',
                      height: 160,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    bodyStyle={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: 16,
                    }}
                  >
                    {/* 排名标记 */}
                    {index < 3 && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: index === 0 ? 'linear-gradient(90deg, #FFD700, #FFA500)' :
                          index === 1 ? 'linear-gradient(90deg, #C0C0C0, #A8A8A8)' :
                            'linear-gradient(90deg, #CD7F32, #A0522D)',
                      }} />
                    )}

                    {/* 排名 */}
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      ...getRankStyle(index + 1)
                    }}>
                      #{index + 1}
                    </div>

                    {/* 图标 */}
                    <div style={{
                      fontSize: 40,
                      marginBottom: 8,
                      transition: 'transform 0.3s ease',
                    }}>
                      {getTopicIcon(topic.name)}
                    </div>

                    {/* 话题名称 */}
                    <Text strong style={{
                      fontSize: 15,
                      color: 'var(--text-primary)',
                      marginBottom: 4,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      #{topic.name}
                    </Text>

                    {/* 动态数 */}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {topic.postCount} 动态
                    </Text>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>

        {/* 底部提示 */}
        {filteredTopics.length > 0 && (
          <div style={{
            textAlign: 'center',
            marginTop: 32,
            padding: '16px 0',
          }}>
            <Space size={10}>
              <div style={{ width: 50, height: 1, background: 'linear-gradient(to right, transparent, #ff6b35, transparent)' }} />
              <Text style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                已展示 {filteredTopics.length} 个话题
              </Text>
              <div style={{ width: 50, height: 1, background: 'linear-gradient(to right, transparent, #ff6b35, transparent)' }} />
            </Space>
          </div>
        )}

        {/* 创建话题弹窗 */}
        <Modal
          title="创建话题"
          open={createModalVisible}
          onCancel={() => setCreateModalVisible(false)}
          footer={null}
          destroyOnClose
          centered
        >
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreateTopic}
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="name"
              label="话题名称"
              rules={[
                { required: true, message: '请输入话题名称' },
                { min: 2, max: 20, message: '话题名称长度在 2-20 个字符' },
              ]}
            >
              <Input
                placeholder="输入话题名称"
                prefix={<span style={{ color: '#ff6b35' }}>#</span>}
                maxLength={20}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setCreateModalVisible(false)}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit" loading={creating}>
                  创建
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}