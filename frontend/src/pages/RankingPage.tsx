import { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Space, TreeSelect, Tag, Empty, Skeleton, Button } from 'antd';
import { StarFilled, FireOutlined, CrownOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { getPosts } from '../api/post';
import PostCard from '../components/PostCard';
import FoodBackground from '../components/FoodBackground';
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
          { title: '临平区', value: '浙江省-杭州市-临平区', key: '浙江省-杭州市-临平区' },
          { title: '钱塘区', value: '浙江省-杭州市-钱塘区', key: '浙江省-杭州市-钱塘区' },
        ]
      },
      {
        title: '宁波市',
        value: '浙江省-宁波市',
        key: '浙江省-宁波市',
        children: [
          { title: '海曙区', value: '浙江省-宁波市-海曙区', key: '浙江省-宁波市-海曙区' },
          { title: '江北区', value: '浙江省-宁波市-江北区', key: '浙江省-宁波市-江北区' },
          { title: '北仑区', value: '浙江省-宁波市-北仑区', key: '浙江省-宁波市-北仑区' },
        ]
      },
      {
        title: '温州市',
        value: '浙江省-温州市',
        key: '浙江省-温州市',
        children: [
          { title: '鹿城区', value: '浙江省-温州市-鹿城区', key: '浙江省-温州市-鹿城区' },
          { title: '龙湾区', value: '浙江省-温州市-龙湾区', key: '浙江省-温州市-龙湾区' },
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
          { title: '长宁区', value: '上海市-上海市-长宁区', key: '上海市-上海市-长宁区' },
          { title: '静安区', value: '上海市-上海市-静安区', key: '上海市-上海市-静安区' },
          { title: '普陀区', value: '上海市-上海市-普陀区', key: '上海市-上海市-普陀区' },
          { title: '虹口区', value: '上海市-上海市-虹口区', key: '上海市-上海市-虹口区' },
          { title: '杨浦区', value: '上海市-上海市-杨浦区', key: '上海市-上海市-杨浦区' },
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
          { title: '丰台区', value: '北京市-北京市-丰台区', key: '北京市-北京市-丰台区' },
          { title: '石景山区', value: '北京市-北京市-石景山区', key: '北京市-北京市-石景山区' },
          { title: '海淀区', value: '北京市-北京市-海淀区', key: '北京市-北京市-海淀区' },
          { title: '门头沟区', value: '北京市-北京市-门头沟区', key: '北京市-北京市-门头沟区' },
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
          { title: '海珠区', value: '广东省-广州市-海珠区', key: '广东省-广州市-海珠区' },
          { title: '荔湾区', value: '广东省-广州市-荔湾区', key: '广东省-广州市-荔湾区' },
        ]
      },
      {
        title: '深圳市',
        value: '广东省-深圳市',
        key: '广东省-深圳市',
        children: [
          { title: '福田区', value: '广东省-深圳市-福田区', key: '广东省-深圳市-福田区' },
          { title: '罗湖区', value: '广东省-深圳市-罗湖区', key: '广东省-深圳市-罗湖区' },
          { title: '南山区', value: '广东省-深圳市-南山区', key: '广东省-深圳市-南山区' },
          { title: '宝安区', value: '广东省-深圳市-宝安区', key: '广东省-深圳市-宝安区' },
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
          { title: '青羊区', value: '四川省-成都市-青羊区', key: '四川省-成都市-青羊区' },
          { title: '金牛区', value: '四川省-成都市-金牛区', key: '四川省-成都市-金牛区' },
          { title: '武侯区', value: '四川省-成都市-武侯区', key: '四川省-成都市-武侯区' },
        ]
      }
    ]
  },
  {
    title: '湖北省',
    value: '湖北省',
    key: '湖北省',
    children: [
      {
        title: '武汉市',
        value: '湖北省-武汉市',
        key: '湖北省-武汉市',
        children: [
          { title: '江岸区', value: '湖北省-武汉市-江岸区', key: '湖北省-武汉市-江岸区' },
          { title: '江汉区', value: '湖北省-武汉市-江汉区', key: '湖北省-武汉市-江汉区' },
          { title: '武昌区', value: '湖北省-武汉市-武昌区', key: '湖北省-武汉市-武昌区' },
          { title: '洪山区', value: '湖北省-武汉市-洪山区', key: '湖北省-武汉市-洪山区' },
        ]
      }
    ]
  },
  {
    title: '江苏省',
    value: '江苏省',
    key: '江苏省',
    children: [
      {
        title: '南京市',
        value: '江苏省-南京市',
        key: '江苏省-南京市',
        children: [
          { title: '玄武区', value: '江苏省-南京市-玄武区', key: '江苏省-南京市-玄武区' },
          { title: '秦淮区', value: '江苏省-南京市-秦淮区', key: '江苏省-南京市-秦淮区' },
          { title: '建邺区', value: '江苏省-南京市-建邺区', key: '江苏省-南京市-建邺区' },
          { title: '鼓楼区', value: '江苏省-南京市-鼓楼区', key: '江苏省-南京市-鼓楼区' },
        ]
      },
      {
        title: '苏州市',
        value: '江苏省-苏州市',
        key: '江苏省-苏州市',
        children: [
          { title: '姑苏区', value: '江苏省-苏州市-姑苏区', key: '江苏省-苏州市-姑苏区' },
          { title: '吴中区', value: '江苏省-苏州市-吴中区', key: '江苏省-苏州市-吴中区' },
          { title: '相城区', value: '江苏省-苏州市-相城区', key: '江苏省-苏州市-相城区' },
        ]
      },
    ]
  },
  {
    title: '陕西省',
    value: '陕西省',
    key: '陕西省',
    children: [
      {
        title: '西安市',
        value: '陕西省-西安市',
        key: '陕西省-西安市',
        children: [
          { title: '新城区', value: '陕西省-西安市-新城区', key: '陕西省-西安市-新城区' },
          { title: '碑林区', value: '陕西省-西安市-碑林区', key: '陕西省-西安市-碑林区' },
          { title: '莲湖区', value: '陕西省-西安市-莲湖区', key: '陕西省-西安市-莲湖区' },
          { title: '雁塔区', value: '陕西省-西安市-雁塔区', key: '陕西省-西安市-雁塔区' },
        ]
      }
    ]
  },
];

// 排序方式
const SORT_OPTIONS = [
  { label: '综合排序', value: 'combined' },
  { label: '点赞最多', value: 'likes' },
  { label: '收藏最多', value: 'favorites' },
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

export default function RankingPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('combined');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const data = await getPosts({ page: 1, pageSize: 100 });
      setPosts(data.data);
    } catch {
      // 忽略错误
    } finally {
      setLoading(false);
    }
  };

  // 根据位置过滤
  const filterByLocation = (post: Post) => {
    if (!selectedLocation) return true;

    const address = post.address || '';
    const parts = selectedLocation.split('-');

    // 检查是否包含选中的省、市或区
    if (parts.length === 1) {
      // 只选了省份
      return address.includes(parts[0]);
    } else if (parts.length === 2) {
      // 选了省市
      return address.includes(parts[0]) && address.includes(parts[1]);
    } else {
      // 选了省市区
      return address.includes(parts[0]) && address.includes(parts[1]) && address.includes(parts[2]);
    }
  };

  // 排序动态
  const sortPosts = (postList: Post[]) => {
    const sorted = [...postList];
    return sorted.sort((a, b) => {
      if (sortBy === 'likes') {
        return (b.likeCount || 0) - (a.likeCount || 0);
      } else if (sortBy === 'favorites') {
        return (b.favoriteCount || 0) - (a.favoriteCount || 0);
      } else {
        // 综合排序：点赞数 + 收藏数*2（收藏权重更高）
        const scoreA = (a.likeCount || 0) + (a.favoriteCount || 0) * 2;
        const scoreB = (b.likeCount || 0) + (b.favoriteCount || 0) * 2;
        return scoreB - scoreA;
      }
    });
  };

  // 处理点赞收藏更新
  const handleUpdate = (updated: Partial<Post> & { id: number }) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  };

  // 过滤和排序后的动态
  const filteredPosts = sortPosts(posts.filter(filterByLocation));

  if (loading) {
    return (
      <div style={{ padding: '16px 0 80px', background: 'linear-gradient(180deg, #fff8f0 0%, #ffe8d6 50%, #ffffff 100%)', minHeight: '60vh' }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
            <CrownOutlined style={{ fontSize: 32, color: '#FFD700', animation: 'crownBounce 2s ease-in-out infinite' }} />
            <Title level={2} style={{ margin: 0, fontSize: 28, fontWeight: 700, background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              🏆 美食风云榜
            </Title>
            <CrownOutlined style={{ fontSize: 32, color: '#FFD700', animation: 'crownBounce 2s ease-in-out infinite 0.5s' }} />
          </div>
          <Text type="secondary" style={{ fontSize: 14 }}>加载精彩榜单中...</Text>
        </div>
        <Row gutter={[14, 14]}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <PostSkeleton key={i} />)}
        </Row>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0 80px', background: 'linear-gradient(180deg, #fff8f0 0%, #ffe8d6 50%, #ffffff 100%)', minHeight: '80vh', position: 'relative', overflow: 'hidden' }}>
      {/* 美食背景 */}
      <FoodBackground count={15} minSize={20} maxSize={40} />

      {/* 页面标题 */}
      <div style={{ marginBottom: 24, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
          <CrownOutlined style={{ fontSize: 36, color: '#FFD700', animation: 'crownBounce 2s ease-in-out infinite' }} />
          <Title level={1} style={{
            margin: 0,
            fontSize: 36,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6B6B 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            🏆 美食风云榜
          </Title>
          <CrownOutlined style={{ fontSize: 36, color: '#FFD700', animation: 'crownBounce 2s ease-in-out infinite 0.5s' }} />
        </div>
        <Text type="secondary" style={{ fontSize: 14, color: '#8c8c8c' }}>
          🔥 发现最受欢迎的街边美食
        </Text>
      </div>

      {/* 筛选条件 */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 20px', position: 'relative', zIndex: 1 }}>
        <Card
          style={{
            marginBottom: 20,
            borderRadius: 16,
            border: '1px solid rgba(255, 215, 0, 0.15)',
            boxShadow: '0 3px 16px rgba(255, 215, 0, 0.08)',
            background: 'linear-gradient(135deg, #ffffff 0%, #fffcf5 100%)'
          }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          {/* 第一行：地区筛选 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(255, 165, 0, 0.08) 100%)',
              borderRadius: 10
            }}>
              <EnvironmentOutlined style={{ color: '#FFA500', fontSize: 14 }} />
              <Text strong style={{ fontSize: 13, color: '#D48806' }}>地区</Text>
            </div>
            <TreeSelect
              value={selectedLocation}
              onChange={setSelectedLocation}
              treeData={LOCATION_DATA}
              placeholder="选择地区"
              style={{ width: 180 }}
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
                  borderRadius: 12,
                  padding: '4px 10px',
                  fontSize: 12,
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(255, 165, 0, 0.08) 100%)',
                  color: '#D48806',
                  border: '1px solid rgba(255, 215, 0, 0.25)'
                }}
              >
                📍 {selectedLocation.split('-').pop()}
              </Tag>
            )}
          </div>

          {/* 第二行：排序方式和统计 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'linear-gradient(135deg, rgba(255, 77, 79, 0.08) 0%, rgba(255, 77, 79, 0.04) 100%)',
                borderRadius: 10,
              }}>
                <StarFilled style={{ color: '#ff4d4f', fontSize: 14 }} />
                <Text strong style={{ fontSize: 13, color: '#262626' }}>排序</Text>
              </div>
              <Space size={6}>
                {SORT_OPTIONS.map(option => (
                  <Button
                    key={option.value}
                    type={sortBy === option.value ? 'primary' : 'default'}
                    onClick={() => setSortBy(option.value)}
                    size={sortBy === option.value ? 'middle' : 'small'}
                    style={{
                      borderRadius: 18,
                      fontWeight: 500,
                      fontSize: 13,
                      ...(sortBy === option.value ? {
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none'
                      } : {})
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </Space>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              background: 'linear-gradient(135deg, rgba(255, 77, 79, 0.08) 0%, rgba(255, 77, 79, 0.04) 100%)',
              borderRadius: 12,
              border: '1px solid rgba(255, 77, 79, 0.15)'
            }}>
              <FireOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
              <Text strong style={{ fontSize: 15, color: '#ff4d4f' }}>
                {filteredPosts.length}
              </Text>
              <Text style={{ fontSize: 12, color: '#8c8c8c' }}>条动态</Text>
            </div>
          </div>
        </Card>
      </div>

      {/* 空状态 */}
      {filteredPosts.length === 0 ? (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 20px', position: 'relative', zIndex: 1 }}>
          <Card style={{
            textAlign: 'center',
            padding: 60,
            borderRadius: 16,
            border: '2px dashed rgba(255, 215, 0, 0.25)',
            background: 'linear-gradient(135deg, #ffffff 0%, #fffcf5 100%)'
          }}>
            <Empty
              imageStyle={{ height: 100 }}
              description={
                <Space direction="vertical" style={{ gap: 12 }}>
                  <div style={{ fontSize: 56 }}>🏆</div>
                  <Text style={{ fontSize: 16, color: '#595959', fontWeight: 500 }}>
                    {selectedLocation ? `${selectedLocation.split('-').pop()}暂无美食动态` : '暂无美食动态'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {selectedLocation ? '🔄 试试切换其他地区' : '✨ 成为第一个分享美食的人吧！'}
                  </Text>
                  {selectedLocation && (
                    <Button
                      type="primary"
                      size="large"
                      onClick={() => setSelectedLocation('')}
                      style={{
                        borderRadius: 20,
                        height: 40,
                        fontWeight: 500,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none'
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
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 20px', position: 'relative', zIndex: 1 }}>
          {/* 美食榜列表 */}
          <Row gutter={[18, 18]}>
            {filteredPosts.map((post, index) => (
              <Col key={post.id} xs={24} sm={12} md={8} lg={6} style={{ display: 'flex', animation: `fadeInUp 0.5s ease ${index * 0.05}s both` }}>
                <div style={{ width: '100%', display: 'flex', position: 'relative', height: 480 }}>
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <PostCard post={post} from="/ranking" onUpdate={handleUpdate} showRank rank={index} />
                  </div>
                </div>
              </Col>
            ))}
          </Row>

          {/* 提示 */}
          <div style={{
            textAlign: 'center',
            marginTop: 36,
            padding: '16px 0',
            background: 'linear-gradient(to right, transparent, rgba(255, 215, 0, 0.08), transparent)'
          }}>
            <Space size={10}>
              <div style={{ width: 50, height: 1, background: 'linear-gradient(to right, transparent, #FFD700, transparent)' }} />
              <Text style={{ fontSize: 13, color: '#8c8c8c' }}>
                按 <Text strong style={{ color: '#FFA500' }}>{SORT_OPTIONS.find(s => s.value === sortBy)?.label}</Text> 排名
              </Text>
              <div style={{ width: 50, height: 1, background: 'linear-gradient(to right, transparent, #FFD700, transparent)' }} />
            </Space>
          </div>
        </div>
      )}

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
        @keyframes crownBounce {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-8px) rotate(-5deg);
          }
          75% {
            transform: translateY(-8px) rotate(5deg);
          }
        }
        @keyframes medalGlow {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.08);
            filter: brightness(1.1);
          }
        }
      `}</style>
    </div>
  );
}
