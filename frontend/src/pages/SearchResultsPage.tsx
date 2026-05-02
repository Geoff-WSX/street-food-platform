import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Input, Tabs, List, Avatar, Empty, Spin, Tag, Space, Typography, Card, Pagination, Button } from 'antd';
import { SearchOutlined, UserOutlined, FileTextOutlined, TeamOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { search, type SearchResult } from '../api/search';
import { getAvatarUrl } from '../utils/images';
import PostCard from '../components/PostCard';
import type { User } from '../types';

const { Text } = Typography;

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const keyword = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as 'all' | 'users' | 'posts') || 'all';

  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts'>(initialType);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [inputValue, setInputValue] = useState(keyword);
  const [page, setPage] = useState(1);

  const doSearch = useCallback(async (q: string, type: 'all' | 'users' | 'posts', pageNum: number = 1) => {
    if (!q.trim()) {
      setResult(null);
      return;
    }

    setLoading(true);
    try {
      const data = await search({
        q: q.trim(),
        type,
        page: pageNum,
        pageSize: 20,
      });
      setResult(data);
      setPage(pageNum);
    } catch (error) {
      console.error('搜索失败:', error);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial search on mount
  useEffect(() => {
    if (keyword) {
      doSearch(keyword, activeTab, page);
    }
  }, []);

  // Handle tab change
  useEffect(() => {
    if (keyword) {
      setSearchParams({ q: keyword, type: activeTab });
      doSearch(keyword, activeTab, 1);
    }
  }, [activeTab]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    doSearch(keyword, activeTab, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle search submit
  const handleSearch = () => {
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim(), type: activeTab });
      doSearch(inputValue.trim(), activeTab, 1);
    }
  };

  // Handle enter key
  const handlePressEnter = () => {
    handleSearch();
  };

  // Navigate to user profile
  const handleUserClick = (user: User) => {
    navigate(`/profile?userId=${user.id}`);
  };

  // Render user list
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
            style={{ padding: '12px 16px', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            <List.Item.Meta
              avatar={<Avatar src={getAvatarUrl(user)} icon={<UserOutlined />} size={48} />}
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

  // Render posts list
  const renderPosts = () => {
    const posts = result?.posts || [];
    if (posts.length === 0) {
      return <Empty description="暂无匹配动态" />;
    }

    return (
      <div className="posts-grid">
        {posts.map((post) => (
          <div key={post.id}>
            <PostCard
              post={post}
              from="/search"
              onUpdate={(updated) => {
                setResult(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    posts: prev.posts?.map(p => p.id === updated.id ? { ...p, ...updated } : p)
                  };
                });
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  // Render all tab content
  const renderAllContent = () => {
    if (loading) {
      return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
    }

    if (!result) {
      return <Empty description="输入关键词搜索用户或动态" />;
    }

    const hasUsers = result.users && result.users.length > 0;
    const hasPosts = result.posts && result.posts.length > 0;

    if (!hasUsers && !hasPosts) {
      return <Empty description={`未找到 "${keyword}" 相关结果`} />;
    }

    return (
      <>
        {hasUsers && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-color)',
              borderBottom: '1px solid var(--border-color)',
            }}>
              <UserOutlined /> 用户 ({result.users?.length})
            </div>
            {renderUsers()}
          </div>
        )}
        {hasPosts && (
          <div>
            <div style={{
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-color)',
              borderBottom: '1px solid var(--border-color)',
            }}>
              <FileTextOutlined /> 动态 ({result.posts?.length})
            </div>
            <div className="posts-grid">
              {result.posts?.map((post) => (
                <div key={post.id}>
                  <PostCard
                    post={post}
                    from="/search"
                    onUpdate={(updated) => {
                      setResult(prev => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          posts: prev.posts?.map(p => p.id === updated.id ? { ...p, ...updated } : p)
                        };
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  // Tab items
  const tabItems = [
    {
      key: 'all',
      label: '全部',
      children: renderAllContent(),
    },
    {
      key: 'users',
      label: (
        <span>
          <UserOutlined /> 用户
        </span>
      ),
      children: (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
          ) : (
            <>
              {renderUsers()}
              {result?.usersPagination && result.usersPagination.totalPages > 1 && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Pagination
                    current={page}
                    pageSize={result.usersPagination.pageSize}
                    total={result.usersPagination.total}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: 'posts',
      label: (
        <span>
          <FileTextOutlined /> 动态
        </span>
      ),
      children: (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
          ) : (
            <>
              {renderPosts()}
              {result?.postsPagination && result.postsPagination.totalPages > 1 && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Pagination
                    current={page}
                    pageSize={result.postsPagination.pageSize}
                    total={result.postsPagination.total}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 0' }}>
      {/* 返回按钮 - 固定在页面左上角 */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{
          position: 'fixed',
          top: 70,
          left: 16,
          zIndex: 1000,
          marginBottom: 0,
          padding: '4px 8px',
          color: 'var(--text-secondary)',
        }}
      >
        返回
      </Button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, color: 'var(--text-primary)', paddingTop: 40 }}>
          搜索结果
        </h1>
        {keyword && (
          <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
            关键词: "{keyword}"
          </Text>
        )}
      </div>

      {/* Search Input */}
      <Card size="small" style={{ marginBottom: 20, background: 'var(--bg-secondary)', border: 'none' }}>
        <Input
          placeholder="搜索用户、美食、地点..."
          prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
          size="large"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={handlePressEnter}
          suffix={
            <Text
              type="secondary"
              style={{ fontSize: 12, cursor: 'pointer' }}
              onClick={handleSearch}
            >
              搜索
            </Text>
          }
          allowClear
          onClear={() => {
            setInputValue('');
            setResult(null);
          }}
        />
      </Card>

      {/* Results Tabs */}
      {keyword ? (
        <Card style={{ background: 'var(--card-bg)', border: 'none' }}>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'all' | 'users' | 'posts')}
            items={tabItems}
          />
        </Card>
      ) : (
        <Card style={{ background: 'var(--card-bg)', border: 'none', padding: 60 }}>
          <Empty description="输入关键词开始搜索" />
        </Card>
      )}
    </div>
  );
}
