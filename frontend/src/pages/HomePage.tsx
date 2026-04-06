import { useState, useEffect } from 'react';
import { Col, Row, Empty, Typography, Card, Space, TreeSelect, Tag, Divider, FloatButton, Skeleton, Button } from 'antd';
import { EnvironmentOutlined, ReloadOutlined, FireOutlined } from '@ant-design/icons';
import { getRandomPosts } from '../api/post';
import PostCard from '../components/PostCard';
import FoodBackground from '../components/FoodBackground';
import { getAnimationStyle, getRandomFoods } from '../utils/foodAnimations';
import { parseImages } from '../utils/images';
import { useScreenSize } from '../hooks/useScreenSize';
import type { Post } from '../types';

const { Title, Text } = Typography;

// 省市区数据
const LOCATION_DATA = [
  {
    title: '浙江省',
    value: '浙江省',
    key: '浙江省',
    children: [
      {
        title: '杭州市',
        value: '浙江省-杭州市',
        key: '浙江省-杭州市',
        children: [
          { title: '西湖区', value: '浙江省-杭州市-西湖区', key: '浙江省-杭州市-西湖区' },
          { title: '上城区', value: '浙江省-杭州市-上城区', key: '浙江省-杭州市-上城区' },
          { title: '拱墅区', value: '浙江省-杭州市-拱墅区', key: '浙江省-杭州市-拱墅区' },
          { title: '滨江区', value: '浙江省-杭州市-滨江区', key: '浙江省-杭州市-滨江区' },
          { title: '萧山区', value: '浙江省-杭州市-萧山区', key: '浙江省-杭州市-萧山区' },
          { title: '余杭区', value: '浙江省-杭州市-余杭区', key: '浙江省-杭州市-余杭区' },
        ]
      },
      {
        title: '宁波市',
        value: '浙江省-宁波市',
        key: '浙江省-宁波市',
        children: [
          { title: '海曙区', value: '浙江省-宁波市-海曙区', key: '浙江省-宁波市-海曙区' },
          { title: '江北区', value: '浙江省-宁波市-江北区', key: '浙江省-宁波市-江北区' },
        ]
      },
    ]
  },
  {
    title: '上海市',
    value: '上海市',
    key: '上海市',
    children: [
      {
        title: '上海市',
        value: '上海市-上海市',
        key: '上海市-上海市',
        children: [
          { title: '黄浦区', value: '上海市-上海市-黄浦区', key: '上海市-上海市-黄浦区' },
          { title: '徐汇区', value: '上海市-上海市-徐汇区', key: '上海市-上海市-徐汇区' },
          { title: '静安区', value: '上海市-上海市-静安区', key: '上海市-上海市-静安区' },
          { title: '浦东新区', value: '上海市-上海市-浦东新区', key: '上海市-上海市-浦东新区' },
        ]
      }
    ]
  },
  {
    title: '北京市',
    value: '北京市',
    key: '北京市',
    children: [
      {
        title: '北京市',
        value: '北京市-北京市',
        key: '北京市-北京市',
        children: [
          { title: '东城区', value: '北京市-北京市-东城区', key: '北京市-北京市-东城区' },
          { title: '西城区', value: '北京市-北京市-西城区', key: '北京市-北京市-西城区' },
          { title: '朝阳区', value: '北京市-北京市-朝阳区', key: '北京市-北京市-朝阳区' },
          { title: '海淀区', value: '北京市-北京市-海淀区', key: '北京市-北京市-海淀区' },
        ]
      }
    ]
  },
  {
    title: '广东省',
    value: '广东省',
    key: '广东省',
    children: [
      {
        title: '广州市',
        value: '广东省-广州市',
        key: '广东省-广州市',
        children: [
          { title: '天河区', value: '广东省-广州市-天河区', key: '广东省-广州市-天河区' },
          { title: '越秀区', value: '广东省-广州市-越秀区', key: '广东省-广州市-越秀区' },
        ]
      },
      {
        title: '深圳市',
        value: '广东省-深圳市',
        key: '广东省-深圳市',
        children: [
          { title: '福田区', value: '广东省-深圳市-福田区', key: '广东省-深圳市-福田区' },
          { title: '南山区', value: '广东省-深圳市-南山区', key: '广东省-深圳市-南山区' },
        ]
      },
    ]
  },
  {
    title: '四川省',
    value: '四川省',
    key: '四川省',
    children: [
      {
        title: '成都市',
        value: '四川省-成都市',
        key: '四川省-成都市',
        children: [
          { title: '锦江区', value: '四川省-成都市-锦江区', key: '四川省-成都市-锦江区' },
          { title: '武侯区', value: '四川省-成都市-武侯区', key: '四川省-成都市-武侯区' },
        ]
      }
    ]
  },
];

// 加载骨架屏
const PostSkeleton = () => (
  <Col xs={24} sm={12} md={8} lg={6}>
    <Card
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        height: '100%'
      }}
      bodyStyle={{ padding: 12 }}>
      <Skeleton.Image active style={{ width: '100%', height: 180, borderRadius: 12 }} />
      <Skeleton active paragraph={{ rows: 2 }} style={{ marginTop: 12 }} />
      <Skeleton active avatar paragraph={{ rows: 1 }} style={{ marginTop: 12 }} />
    </Card>
  </Col>
);

export default function HomePage() {
  const screenSize = useScreenSize();
  const [posts, setPosts] = useState<Post[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const loadRandomPosts = async (showLoading = true) => {
    try {
      if (showLoading) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }

      console.log('🔄 开始加载随机动态...');
      // 始终请求20条，不排除已显示的，允许重复推荐
      const data = await getRandomPosts({ limit: 20 });
      console.log('✅ API响应:', data);

      const validPosts = (data || []).filter((post) => {
        const images = parseImages(post.images);
        return post &&
          post.content &&
          post.images &&
          images.length > 0 &&
          post.user &&
          post.user.username;
      });

      console.log('📦 有效动态数量:', validPosts.length, '/', (data || []).length);
      setPosts(validPosts);
    } catch (error) {
      // 静默处理加载失败，保持当前帖子列表
      console.error('❌ 加载动态失败:', error);
    } finally {
      if (showLoading) {
        setInitialLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadRandomPosts();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      const fetchData = async () => {
        try {
          setRefreshing(true);
          const data = await getRandomPosts({ limit: 20 });

          const validPosts = (data || []).filter((post) => {
            return post &&
              post.content &&
              post.images &&
              Array.isArray(post.images) &&
              post.images.length > 0 &&
              post.user &&
              post.user.username;
          });

          setPosts(validPosts);
        } catch {
          // 静默处理加载失败
        } finally {
          setRefreshing(false);
        }
      };
      fetchData();
    } else {
      loadRandomPosts(false);
    }
  }, [selectedLocation]);

  const handleUpdate = (updated: Partial<Post> & { id: number }) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  };

  const handleRefresh = () => {
    // 始终使用随机推荐模式
    loadRandomPosts(false);
  };

  const filterByLocation = (post: Post) => {
    if (!selectedLocation) return true;

    const address = post.address || '';
    const parts = selectedLocation.split('-');

    if (parts.length === 1) {
      return address.includes(parts[0]);
    } else if (parts.length === 2) {
      return address.includes(parts[0]) && address.includes(parts[1]);
    } else {
      return address.includes(parts[0]) && address.includes(parts[1]) && address.includes(parts[2]);
    }
  };

  const filteredPosts = posts.filter(filterByLocation);

  if (initialLoading) {
    return (
      <div style={{ padding: screenSize.isSmallMobile ? '12px 0 60px' : screenSize.isMobile ? '16px 0 70px' : '20px 0 80px', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)', minHeight: '60vh' }}>
        <div style={{ marginBottom: screenSize.isMobile ? 12 : 16, position: 'relative', zIndex: 1, padding: screenSize.isSmallMobile ? '0 12px' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: screenSize.isSmallMobile ? 6 : 8, marginBottom: 6 }}>
            {getRandomFoods(screenSize.isMobile ? 2 : 3).map((food, i) => (
              <span
                key={i}
                style={{
                  fontSize: screenSize.isSmallMobile ? 16 : 20,
                  display: 'inline-block',
                  ...getAnimationStyle('float', 4 + i * 0.5, i * 0.2),
                }}
              >
                {food}
              </span>
            ))}
          </div>
          <Title level={2} style={{ margin: 0, fontSize: screenSize.isSmallMobile ? 18 : screenSize.isMobile ? 20 : 24, fontWeight: 700 }}>
            <span style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #ffb347 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              🔥 发现美食
            </span>
          </Title>
          <Text type="secondary" style={{ fontSize: screenSize.isSmallMobile ? 11 : 12, color: '#8c8c8c' }}>
            加载精彩内容中...
          </Text>
        </div>
        <Row gutter={[screenSize.isSmallMobile ? 12 : screenSize.isMobile ? 14 : 16, screenSize.isSmallMobile ? 12 : 16]}>
          {[1, 2, 3, 4, 5, 6].map(i => <PostSkeleton key={i} />)}
        </Row>
      </div>
    );
  }

  return (
    <div style={{ padding: screenSize.isSmallMobile ? '12px 0 60px' : screenSize.isMobile ? '16px 0 70px' : '20px 0 80px', background: 'linear-gradient(180deg, #fff8f0 0%, #ffe8d6 30%, #fff5f0 60%, #ffffff 100%)', minHeight: '80vh', position: 'relative', overflow: 'hidden' }}>
      {/* 美食背景 */}
      <FoodBackground count={screenSize.isMobile ? 10 : 18} minSize={screenSize.isSmallMobile ? 16 : 22} maxSize={screenSize.isSmallMobile ? 32 : 45} />

      {/* 页面标题 */}
      <div style={{ marginBottom: screenSize.isMobile ? 14 : 18, position: 'relative', zIndex: 1, padding: screenSize.isSmallMobile ? '0 16px' : '0 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: screenSize.isSmallMobile ? 8 : 12, marginBottom: 10 }}>
          {getRandomFoods(screenSize.isMobile ? 3 : 4).map((food, i) => (
            <span
              key={i}
              style={{
                fontSize: screenSize.isSmallMobile ? 18 : 24,
                display: 'inline-block',
                filter: 'drop-shadow(0 2px 4px rgba(255, 107, 53, 0.3))',
                ...getAnimationStyle('float', 4 + i * 0.5, i * 0.2),
              }}
            >
              {food}
            </span>
          ))}
        </div>
        <Title level={2} style={{ margin: 0, fontSize: screenSize.isSmallMobile ? 20 : screenSize.isMobile ? 24 : 28, fontWeight: 800 }}>
          <span style={{
            background: 'linear-gradient(135deg, #ff6b35 0%, #ff8e53 50%, #ffb347 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 2px 8px rgba(255, 107, 53, 0.2))'
          }}>
            🔥 发现美食
          </span>
        </Title>
        <Text type="secondary" style={{ fontSize: screenSize.isSmallMobile ? 12 : 14, color: '#8c8c8c' }}>
          {screenSize.isMobile ? '随机推荐美食动态' : '✨ 随机推荐精彩美食动态'}
        </Text>
      </div>

      {/* 筛选条件 */}
      <div style={{ padding: screenSize.isSmallMobile ? '0 16px' : '0 24px', position: 'relative', zIndex: 1 }}>
        <Card
          style={{
            marginBottom: screenSize.isMobile ? 14 : 18,
            borderRadius: screenSize.isMobile ? 12 : 14,
            border: '1px solid rgba(255, 107, 53, 0.1)',
            boxShadow: '0 4px 16px rgba(255, 107, 53, 0.08)',
            background: 'linear-gradient(135deg, #ffffff 0%, #fffbf8 100%)'
          }}
          bodyStyle={{ padding: screenSize.isSmallMobile ? '12px 16px' : '14px 20px' }}
        >
          <Space size={screenSize.isMobile ? 10 : 14} wrap>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: screenSize.isSmallMobile ? 6 : 8,
              padding: screenSize.isSmallMobile ? '6px 12px' : '8px 16px',
              background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 179, 71, 0.08) 100%)',
              borderRadius: screenSize.isMobile ? 10 : 12,
              border: '1px solid rgba(255, 107, 53, 0.15)'
            }}>
              <EnvironmentOutlined style={{ color: '#ff6b6b', fontSize: screenSize.isSmallMobile ? 14 : 16 }} />
              <Text strong style={{ fontSize: screenSize.isSmallMobile ? 13 : 15, color: '#ff6b6b' }}>地区</Text>
            </div>
            <TreeSelect
              value={selectedLocation}
              onChange={setSelectedLocation}
              treeData={LOCATION_DATA}
              placeholder={screenSize.isMobile ? "选择地区" : "选择地区发现美食"}
              style={{ width: screenSize.isSmallMobile ? 130 : screenSize.isMobile ? 160 : 200 }}
              size={screenSize.isMobile ? "middle" : "large"}
              allowClear
              showSearch
              treeDefaultExpandAll={false}
              dropdownStyle={{ minWidth: screenSize.isSmallMobile ? 180 : 220 }}
            />
            {selectedLocation && (
              <Tag
                closable
                onClose={() => setSelectedLocation('')}
                style={{
                  borderRadius: screenSize.isMobile ? 10 : 12,
                  padding: screenSize.isSmallMobile ? '4px 10px' : '6px 14px',
                  fontSize: screenSize.isSmallMobile ? 12 : 14,
                  background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.12) 0%, rgba(255, 179, 71, 0.1) 100%)',
                  color: '#ff6b6b',
                  border: '1px solid rgba(255, 107, 53, 0.2)'
                }}
              >
                📍 {selectedLocation.split('-').pop()}
              </Tag>
            )}
            <Divider type="vertical" style={{ margin: 0, height: screenSize.isSmallMobile ? 18 : 24 }} />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: screenSize.isSmallMobile ? 6 : 8,
              padding: screenSize.isSmallMobile ? '6px 12px' : '8px 16px',
              background: 'linear-gradient(135deg, rgba(250, 173, 20, 0.1) 0%, rgba(250, 173, 20, 0.05) 100%)',
              borderRadius: screenSize.isMobile ? 10 : 12,
              border: '1px solid rgba(250, 173, 20, 0.2)'
            }}>
              <FireOutlined style={{ color: '#ff4d4f', fontSize: screenSize.isSmallMobile ? 14 : 16 }} />
              <Text strong style={{ fontSize: screenSize.isSmallMobile ? 14 : 16, color: '#ff4d4f' }}>
                {filteredPosts.length}
              </Text>
              <Text style={{ fontSize: screenSize.isSmallMobile ? 12 : 14, color: '#8c8c8c' }}>条动态</Text>
            </div>
          </Space>
        </Card>
      </div>

      {/* 空状态 */}
      {filteredPosts.length === 0 ? (
        <div style={{ padding: screenSize.isSmallMobile ? '0 16px' : '0 24px' }}>
          <Card style={{
            textAlign: 'center',
            padding: screenSize.isSmallMobile ? 50 : screenSize.isMobile ? 70 : 90,
            borderRadius: screenSize.isMobile ? 16 : 20,
            border: '2px dashed rgba(255, 107, 53, 0.2)',
            background: 'linear-gradient(135deg, #ffffff 0%, #fffbf8 100%)',
            boxShadow: '0 4px 16px rgba(255, 107, 53, 0.05)'
          }}>
            <Empty
              imageStyle={{ height: screenSize.isMobile ? 90 : 110 }}
              description={
                <Space direction="vertical" size={screenSize.isMobile ? 12 : 16}>
                  <div style={{ fontSize: screenSize.isMobile ? 56 : 68 }}>🍽️</div>
                  <Text style={{ fontSize: screenSize.isSmallMobile ? 16 : screenSize.isMobile ? 18 : 20, color: '#595959', fontWeight: 500 }}>
                    {selectedLocation ? `${selectedLocation.split('-').pop()}暂无美食动态` : '暂无美食动态'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: screenSize.isSmallMobile ? 14 : 16 }}>
                    {selectedLocation ? '🔄 试试切换其他地区' : '✨ 成为第一个分享美食的人吧！'}
                  </Text>
                  {selectedLocation && (
                    <Button
                      type="primary"
                      onClick={() => setSelectedLocation('')}
                      size={screenSize.isMobile ? "middle" : "large"}
                      style={{
                        borderRadius: screenSize.isMobile ? 20 : 24,
                        fontWeight: 500,
                        background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
                        border: 'none',
                        boxShadow: '0 4px 16px rgba(255, 107, 53, 0.3)'
                      }}
                    >
                      查看全部动态
                    </Button>
                  )}
                </Space>
              }
            />
          </Card>
        </div>
      ) : (
        <>
          {/* 动态列表 */}
          <div style={{ padding: screenSize.isSmallMobile ? '0 16px' : '0 24px' }}>
            <Row gutter={[screenSize.isSmallMobile ? 12 : screenSize.isMobile ? 16 : 20, screenSize.isSmallMobile ? 12 : 16]}>
              {filteredPosts.map((post, index) => (
                <Col key={post.id} xs={24} sm={12} md={8} lg={6} style={{ display: 'flex', animation: `fadeInUp 0.5s ease ${index * 0.08}s both` }}>
                  <div style={{ width: '100%', display: 'flex', height: 480 }}>
                    <div style={{ width: '100%', height: '100%' }}>
                      <PostCard post={post} from="/" onUpdate={handleUpdate} />
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>

          {/* 底部提示 */}
          {filteredPosts.length > 0 && (
            <div style={{
              textAlign: 'center',
              marginTop: screenSize.isMobile ? 20 : 28,
              padding: screenSize.isMobile ? '14px 0' : '18px 0',
              background: 'linear-gradient(to right, transparent, rgba(255, 107, 53, 0.08), transparent)'
            }}>
              <Space size={screenSize.isSmallMobile ? 8 : 10}>
                <div style={{ width: screenSize.isSmallMobile ? 30 : 40, height: 1, background: 'linear-gradient(to right, transparent, #ff6b6b, transparent)' }} />
                <Text type="secondary" style={{ fontSize: screenSize.isSmallMobile ? 12 : 14, color: '#8c8c8c' }}>
                  💡 点击刷新按钮发现更多美食
                </Text>
                <div style={{ width: screenSize.isSmallMobile ? 30 : 40, height: 1, background: 'linear-gradient(to right, transparent, #ff6b6b, transparent)' }} />
              </Space>
            </div>
          )}
        </>
      )}

      {/* 右下角刷新按钮 */}
      <FloatButton.Group
        shape="circle"
        style={{ right: screenSize.isSmallMobile ? 16 : 24, bottom: screenSize.isSmallMobile ? 70 : 24, zIndex: 1001 }}
      >
        <FloatButton
          icon={<ReloadOutlined spin={refreshing} />}
          type="primary"
          onClick={handleRefresh}
          tooltip="随机推荐"
          style={{
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            boxShadow: '0 6px 20px rgba(79, 172, 254, 0.4)'
          }}
        />
      </FloatButton.Group>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
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
