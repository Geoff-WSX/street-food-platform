import { useState, useEffect } from 'react';
import { Col, Row, Spin, Empty, Typography, Card, Space, TreeSelect, Tag, Divider, FloatButton, Skeleton } from 'antd';
import { EnvironmentOutlined, ReloadOutlined, FireOutlined } from '@ant-design/icons';
import { getRandomPosts } from '../api/post';
import PostCard from '../components/PostCard';
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
    >
      <Skeleton.Image active style={{ width: '100%', height: 200, borderRadius: 12 }} />
      <Skeleton active paragraph={{ rows: 2 }} style={{ marginTop: 16 }} />
      <Skeleton active avatar paragraph={{ rows: 1 }} style={{ marginTop: 12 }} />
    </Card>
  </Col>
);

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
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

      const currentIds = posts.map(p => p.id);
      const data = await getRandomPosts({
        limit: 20,
        excludeIds: currentIds.length > 0 ? currentIds.join(',') : undefined
      });

      const validPosts = (data.data || []).filter((post) => {
        return post &&
          post.content &&
          post.images &&
          Array.isArray(post.images) &&
          post.images.length > 0 &&
          post.user &&
          post.user.username;
      });

      setPosts(validPosts);
    } catch (error) {
      console.error('Failed to fetch random posts:', error);
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
          setLoading(true);
          const data = await getRandomPosts({ limit: 20 });

          const validPosts = (data.data || []).filter((post) => {
            return post &&
              post.content &&
              post.images &&
              Array.isArray(post.images) &&
              post.images.length > 0 &&
              post.user &&
              post.user.username;
          });

          setPosts(validPosts);
        } catch (error) {
          console.error('Failed to fetch posts:', error);
        } finally {
          setLoading(false);
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
      <div style={{ padding: '24px 0 80px', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)', minHeight: '60vh' }}>
        <div style={{ marginBottom: 32 }}>
          <Title level={2} style={{ margin: 0, fontSize: 28, fontWeight: 700, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            🔥 发现美食
          </Title>
          <Text type="secondary" style={{ fontSize: 15, marginLeft: 4 }}>加载精彩内容中...</Text>
        </div>
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <PostSkeleton key={i} />)}
        </Row>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0 80px', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)', minHeight: '80vh' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontSize: 32, fontWeight: 700 }}>
          <span style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            🔥 发现美食
          </span>
        </Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <div style={{ height: 1, flex: 1, maxWidth: 100, background: 'linear-gradient(to right, #667eea, transparent)' }} />
          <Text type="secondary" style={{ fontSize: 15, color: '#8c8c8c', fontWeight: 400 }}>
            ✨ 随机推荐精彩美食动态，点击刷新发现更多
          </Text>
        </div>
      </div>

      {/* 筛选条件 */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 16,
          border: '1px solid #e8e8e8',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Space size={20} wrap>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            borderRadius: 12
          }}>
            <EnvironmentOutlined style={{ color: '#667eea', fontSize: 16 }} />
            <Text strong style={{ fontSize: 15, color: '#262626' }}>地区筛选</Text>
          </div>
          <TreeSelect
            value={selectedLocation}
            onChange={setSelectedLocation}
            treeData={LOCATION_DATA}
            placeholder="选择地区发现美食"
            style={{ width: 220 }}
            size="large"
            allowClear
            showSearch
            treeDefaultExpandAll={false}
          />
          {selectedLocation && (
            <Tag
              closable
              onClose={() => setSelectedLocation('')}
              style={{
                borderRadius: 16,
                padding: '6px 14px',
                fontSize: 14,
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                color: '#667eea',
                border: '1px solid rgba(102, 126, 234, 0.2)'
              }}
            >
              📍 {selectedLocation.split('-').pop()}
            </Tag>
          )}
          <Divider type="vertical" style={{ margin: 0, height: 24 }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: 'linear-gradient(135deg, rgba(255, 77, 79, 0.1) 0%, rgba(255, 77, 79, 0.05) 100%)',
            borderRadius: 12,
            border: '1px solid rgba(255, 77, 79, 0.2)'
          }}>
            <FireOutlined style={{ color: '#ff4d4f' }} />
            <Text strong style={{ fontSize: 15, color: '#262626' }}>
              {filteredPosts.length}
            </Text>
            <Text style={{ fontSize: 14, color: '#8c8c8c' }}>条美食动态</Text>
          </div>
        </Space>
      </Card>

      {/* 空状态 */}
      {filteredPosts.length === 0 ? (
        <Card style={{
          textAlign: 'center',
          padding: 80,
          borderRadius: 20,
          border: '2px dashed #e8e8e8',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
        }}>
          <Empty
            imageStyle={{ height: 120 }}
            description={
              <Space direction="vertical" size={16}>
                <div style={{ fontSize: 64 }}>🍽️</div>
                <Text style={{ fontSize: 18, color: '#595959', fontWeight: 500 }}>
                  {selectedLocation ? `${selectedLocation.split('-').pop()}暂无美食动态` : '暂无美食动态'}
                </Text>
                <Text type="secondary" style={{ fontSize: 15 }}>
                  {selectedLocation ? '🔄 试试切换其他地区' : '✨ 成为第一个分享美食的人吧！'}
                </Text>
                {selectedLocation && (
                  <Button
                    type="primary"
                    onClick={() => setSelectedLocation('')}
                    style={{
                      borderRadius: 20,
                      height: 40,
                      paddingLeft: 24,
                      paddingRight: 24,
                      fontWeight: 500
                    }}
                  >
                    查看全部动态
                  </Button>
                )}
              </Space>
            }
          />
        </Card>
      ) : (
        <>
          {/* 动态列表 */}
          <Row gutter={[20, 20]}>
            {filteredPosts.map((post, index) => (
              <Col key={post.id} xs={24} sm={12} md={8} lg={6} style={{ display: 'flex', animation: `fadeInUp 0.5s ease ${index * 0.1}s both` }}>
                <div style={{ width: '100%', display: 'flex' }}>
                  <PostCard post={post} onUpdate={handleUpdate} />
                </div>
              </Col>
            ))}
          </Row>

          {/* 底部提示 */}
          {filteredPosts.length > 0 && (
            <div style={{
              textAlign: 'center',
              marginTop: 40,
              padding: '24px 0',
              background: 'linear-gradient(to right, transparent, rgba(102, 126, 234, 0.1), transparent)'
            }}>
              <Space size={12}>
                <div style={{ width: 40, height: 1, background: 'linear-gradient(to right, transparent, #d9d9d9, transparent)' }} />
                <Text type="secondary" style={{ fontSize: 14, color: '#8c8c8c' }}>
                  💡 点击刷新按钮发现更多美食
                </Text>
                <div style={{ width: 40, height: 1, background: 'linear-gradient(to right, transparent, #d9d9d9, transparent)' }} />
              </Space>
            </div>
          )}
        </>
      )}

      {/* 右下角刷新按钮 */}
      <FloatButton.Group
        shape="circle"
        style={{ right: 24, bottom: 24, zIndex: 1001 }}
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
