import { useState, useEffect } from 'react';
import { Row, Col, Empty, Typography, Space, TreeSelect, Tag, Divider, FloatButton, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getRandomPosts } from '../api/post';
import { cancelAllPendingRequests } from '../api/index';
import PostCard from '../components/PostCard';
import FoodBackground from '../components/FoodBackground';
import { parseImages } from '../utils/images';
import { useScreenSize } from '../hooks/useScreenSize';
import type { Post } from '../types';
import '../styles/homePage.css';
import '../styles/urbanFoodie.css';
import '../styles/urbanInteractions.css';

const { Text } = Typography;

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

export default function HomePage() {
  const screenSize = useScreenSize();
  const [posts, setPosts] = useState<Post[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const loadRandomPosts = async (showLoading = true) => {
    try {
      if (showLoading) setInitialLoading(true);
      else setRefreshing(true);

      const data = await getRandomPosts({ limit: 20 });

      const validPosts = (data || []).filter((post) => {
        const images = parseImages(post.images);
        return post?.content && post?.images && images.length > 0 && post?.user?.username;
      });

      setPosts(validPosts);
    } catch (error) {
      console.error('加载动态失败:', error);
    } finally {
      if (showLoading) setInitialLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRandomPosts();
    // 组件卸载时取消所有进行中的请求
    return () => {
      cancelAllPendingRequests();
    };
  }, []);

  useEffect(() => {
    loadRandomPosts(false);
  }, [selectedLocation]);

  const handleUpdate = (updated: Partial<Post> & { id: number }) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  };

  const handleRefresh = () => loadRandomPosts(false);

  const filterByLocation = (post: Post) => {
    if (!selectedLocation) return true;
    const address = post.address || '';
    const parts = selectedLocation.split('-');
    return parts.every((part) => address.includes(part));
  };

  const filteredPosts = posts.filter(filterByLocation);

  // 骨架屏加载状态
  if (initialLoading) {
    return (
      <div className="home-page-container">
        <header className="home-header stagger-fade-in">
          <h1 className="home-title gradient-text">发现美食</h1>
          <p className="home-subtitle">加载精彩内容中...</p>
        </header>
        <Row gutter={[screenSize.isSmallMobile ? 12 : 16, screenSize.isSmallMobile ? 12 : 16]}>
          {[1, 2, 3, 4, 5, 6].map((i) => <PostSkeleton key={i} />)}
        </Row>
      </div>
    );
  }

  return (
    <div className="home-page-container">
      {/* 美食背景 */}
      <FoodBackground count={screenSize.isMobile ? 10 : 18} minSize={screenSize.isSmallMobile ? 16 : 22} maxSize={screenSize.isSmallMobile ? 32 : 45} />

      {/* 页面内容 */}
      <div className="home-content">
        {/* 页面标题 */}
        <header className="home-header stagger-fade-in delay-1">
          <h1 className="home-title gradient-text">发现美食</h1>
          <p className="home-subtitle">{screenSize.isMobile ? '随机推荐美食动态' : '✨ 随机推荐精彩美食动态'}</p>
        </header>

        {/* 筛选条件 */}
        <div className="filter-bar card-trendy stagger-fade-in delay-2">
          <Space size={screenSize.isMobile ? 10 : 14} wrap>
            <div className="filter-label">
              地区
            </div>

            <TreeSelect
              value={selectedLocation}
              onChange={setSelectedLocation}
              treeData={LOCATION_DATA}
              placeholder={screenSize.isMobile ? '选择地区' : '选择地区发现美食'}
              style={{ width: screenSize.isSmallMobile ? 130 : screenSize.isMobile ? 160 : 200 }}
              size={screenSize.isMobile ? 'middle' : 'large'}
              allowClear
              showSearch
              treeDefaultExpandAll={false}
              dropdownStyle={{ minWidth: screenSize.isSmallMobile ? 180 : 220 }}
            />

            {selectedLocation && (
              <Tag
                closable
                onClose={() => setSelectedLocation('')}
                className="location-tag"
              >
                📍 {selectedLocation.split('-').pop()}
              </Tag>
            )}

            <Divider type="vertical" style={{ margin: 0, height: screenSize.isSmallMobile ? 18 : 24 }} />

            <div className="stats-badge">
              <Text strong>{filteredPosts.length}</Text>
              <Text type="secondary">条动态</Text>
            </div>
          </Space>
        </div>

        {/* 空状态 */}
        {filteredPosts.length === 0 ? (
          <div className="empty-state card-trendy stagger-fade-in delay-2">
            <Empty
              imageStyle={{ height: screenSize.isMobile ? 90 : 110 }}
              description={
                <Space direction="vertical" size={screenSize.isMobile ? 12 : 16}>
                  <div style={{ fontSize: screenSize.isMobile ? 56 : 68 }}>🍽️</div>
                  <Text style={{ fontSize: screenSize.isSmallMobile ? 16 : screenSize.isMobile ? 18 : 20, fontWeight: 500 }}>
                    {selectedLocation ? `${selectedLocation.split('-').pop()}暂无美食动态` : '暂无美食动态'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: screenSize.isSmallMobile ? 14 : 16 }}>
                    {selectedLocation ? '🔄 试试切换其他地区' : '✨ 成为第一个分享美食的人吧！'}
                  </Text>
                  {selectedLocation && (
                    <Button
                      type="primary"
                      onClick={() => setSelectedLocation('')}
                      size={screenSize.isMobile ? 'middle' : 'large'}
                      className="btn-primary"
                    >
                      查看全部动态
                    </Button>
                  )}
                </Space>
              }
            />
          </div>
        ) : (
          <>
            {/* 动态列表 */}
            <div className="posts-grid stagger-fade-in delay-3">
              {filteredPosts.map((post, index) => (
                <div
                  key={post.id}
                  className={`stagger-fade-in delay-${Math.min(index + 1, 8)}`}
                >
                  <PostCard post={post} from="/" onUpdate={handleUpdate} />
                </div>
              ))}
            </div>

            {/* 底部提示 */}
            {filteredPosts.length > 0 && (
              <div className="footer-tip">
                <Space size={screenSize.isSmallMobile ? 8 : 10}>
                  <div className="decorative-line" />
                  <Text type="secondary" style={{ fontSize: screenSize.isSmallMobile ? 12 : 14 }}>
                    💡 点击刷新按钮发现更多美食
                  </Text>
                  <div className="decorative-line" />
                </Space>
              </div>
            )}
          </>
        )}
      </div>

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
          className="refresh-button"
        />
      </FloatButton.Group>
    </div>
  );
}