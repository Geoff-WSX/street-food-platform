import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Input, Tabs, List, Avatar, Empty, Spin, Tag, Space, Typography, Badge } from 'antd';
import { SearchOutlined, UserOutlined, FileTextOutlined, EnvironmentOutlined, HeartOutlined, StarOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { search, type SearchResult } from '../api/search';
import type { Post, User } from '../types';
import './SearchModal.css';

const { Text, Paragraph } = Typography;

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const inputRef = useRef<any>(null);

  // 防抖搜索
  const doSearch = useCallback(async (q: string, type: string) => {
    if (!q.trim()) {
      setResult(null);
      return;
    }

    setLoading(true);
    try {
      const data = await search({
        q: q.trim(),
        type: type as any,
        pageSize: 20,
      });
      setResult(data);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 延迟搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyword.trim()) {
        doSearch(keyword, activeTab);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword, activeTab, doSearch]);

  // 自动聚焦
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setKeyword('');
      setResult(null);
    }
  }, [open]);

  // Tab 切换
  useEffect(() => {
    if (keyword.trim()) {
      doSearch(keyword, activeTab);
    }
  }, [activeTab]);

  const handleUserClick = (user: User) => {
    onClose();
    navigate(`/profile?userId=${user.id}`);
  };

  const handlePostClick = (post: Post) => {
    onClose();
    navigate(`/post/${post.id}`);
  };

  // 用户列表
  const renderUsers = () => {
    const users = result?.users || [];
    if (users.length === 0) {
      return <Empty description="暂无匹配用户" />;
    }

    return (
      <List
        dataSource={users}
        renderItem={(user) => (
          <List.Item
            className="search-result-item"
            onClick={() => handleUserClick(user)}
          >
            <List.Item.Meta
              avatar={<Avatar src={user.avatar} icon={<UserOutlined />} size={48} />}
              title={
                <Space>
                  <Text strong>{user.username}</Text>
                  {user.role === 'admin' && <Tag color="red">管理员</Tag>}
                  {user.role === 'reviewer' && <Tag color="orange">审核员</Tag>}
                </Space>
              }
              description={
                <div>
                  {user.bio && <Text type="secondary" ellipsis style={{ maxWidth: 300 }}>{user.bio}</Text>}
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <TeamOutlined /> {user.followerCount} 粉丝
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                      <FileTextOutlined /> {user.postCount} 动态
                    </Text>
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  // 动态列表
  const renderPosts = () => {
    const posts = result?.posts || [];
    if (posts.length === 0) {
      return <Empty description="暂无匹配动态" />;
    }

    return (
      <List
        dataSource={posts}
        renderItem={(post) => {
          // 处理图片 URL
          let imageUrl = '';
          if (post.images) {
            const images = Array.isArray(post.images)
              ? post.images
              : post.images.split(',').filter(Boolean);
            if (images.length > 0) {
              imageUrl = images[0].startsWith('http')
                ? images[0]
                : `/uploads/posts/${images[0].split('/').pop()}`;
            }
          }

          return (
            <List.Item
              className="search-result-item"
              onClick={() => handlePostClick(post)}
            >
              <List.Item.Meta
                avatar={
                  imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 8,
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.remove();
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 80,
                      height: 80,
                      background: '#f5f5f5',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                    }}>
                      🍜
                    </div>
                  )
                }
                title={
                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{ marginBottom: 0 }}
                  >
                    {post.content}
                  </Paragraph>
                }
                description={
                  <div>
                    <Space size={8}>
                      <Avatar src={post.user?.avatar} size="small" icon={<UserOutlined />} />
                      <Text type="secondary" style={{ fontSize: 12 }}>{post.user?.username}</Text>
                    </Space>
                    <div style={{ marginTop: 4, display: 'flex', gap: 12 }}>
                      {post.address && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <EnvironmentOutlined /> {post.address}
                        </Text>
                      )}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <HeartOutlined /> {post.likeCount}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <StarOutlined /> {post.favoriteCount}
                      </Text>
                    </div>
                  </div>
                }
              />
            </List.Item>
          );
        }}
      />
    );
  };

  // Tab 项
  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          全部
          {result && (result.users?.length || result.posts?.length) ? (
            <Badge
              count={(result.users?.length || 0) + (result.posts?.length || 0)}
              style={{ marginLeft: 8 }}
              size="small"
            />
          ) : null}
        </span>
      ),
      children: (
        <div className="search-results">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : result ? (
            <>
              {result.users && result.users.length > 0 && (
                <div className="search-section">
                  <div className="search-section-title">
                    <UserOutlined /> 用户
                  </div>
                  {renderUsers()}
                </div>
              )}
              {result.posts && result.posts.length > 0 && (
                <div className="search-section">
                  <div className="search-section-title">
                    <FileTextOutlined /> 动态
                  </div>
                  {renderPosts()}
                </div>
              )}
              {(!result.users?.length && !result.posts?.length) && (
                <Empty description={`未找到 "${keyword}" 相关结果`} />
              )}
            </>
          ) : (
            <Empty description="输入关键词搜索用户或动态" />
          )}
        </div>
      ),
    },
    {
      key: 'users',
      label: (
        <span>
          <UserOutlined /> 用户
          {result?.users?.length ? (
            <Badge count={result.users.length} style={{ marginLeft: 8 }} size="small" />
          ) : null}
        </span>
      ),
      children: (
        <div className="search-results">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : (
            renderUsers()
          )}
        </div>
      ),
    },
    {
      key: 'posts',
      label: (
        <span>
          <FileTextOutlined /> 动态
          {result?.posts?.length ? (
            <Badge count={result.posts.length} style={{ marginLeft: 8 }} size="small" />
          ) : null}
        </span>
      ),
      children: (
        <div className="search-results">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : (
            renderPosts()
          )}
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      className="search-modal"
      title={null}
      closable={false}
      styles={{
        body: { padding: 0 },
      }}
    >
      {/* 搜索框 */}
      <div className="search-header">
        <Input
          ref={inputRef}
          placeholder="搜索用户、美食、地点..."
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          size="large"
          allowClear
          suffix={
            keyword ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {loading ? '搜索中...' : '回车搜索'}
              </Text>
            ) : null
          }
        />
      </div>

      {/* 结果 Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        tabBarStyle={{ padding: '0 16px', marginBottom: 0 }}
      />
    </Modal>
  );
}