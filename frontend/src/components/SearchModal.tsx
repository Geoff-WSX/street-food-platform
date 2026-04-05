import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Input, Tabs, List, Avatar, Empty, Spin, Tag, Space, Typography, AutoComplete } from 'antd';
import { SearchOutlined, UserOutlined, FileTextOutlined, EnvironmentOutlined, HeartOutlined, StarOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { search, searchSuggestions, type SearchResult, type SearchSuggestion } from '../api/search';
import { parseImages } from '../utils/images';
import type { Post, User } from '../types';
import './SearchModal.css';

const { Text, Paragraph } = Typography;

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

interface CachedResult {
  data: SearchResult;
  timestamp: number;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 搜索建议相关
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 缓存各 Tab 的搜索结果，key 格式: "keyword-tabType"
  const resultsCacheRef = useRef<Map<string, CachedResult>>(new Map());

  // 获取搜索建议（防抖）
  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const data = await searchSuggestions(q.trim());
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error('获取搜索建议失败:', error);
      setSuggestions([]);
    }
  }, []);

  // 防抖：根据输入状态决定显示建议还是搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyword && !result) {
        // 没有搜索结果时，显示建议
        fetchSuggestions(keyword);
      } else if (result && keyword !== result.keyword) {
        // 有关键词变化时，清除结果并显示建议
        setResult(null);
        fetchSuggestions(keyword);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [keyword, result, fetchSuggestions]);

  // 防抖搜索
  const doSearch = useCallback(async (q: string, type: string) => {
    if (!q.trim()) {
      setResult(null);
      return;
    }

    const trimmedKeyword = q.trim();
    const cacheKey = `${trimmedKeyword}-${type}`;

    // 检查缓存
    const cached = resultsCacheRef.current.get(cacheKey);
    if (cached) {
      setResult(cached.data);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    setShowSuggestions(false);
    try {
      const data = await search({
        q: trimmedKeyword,
        type: type as 'all' | 'users' | 'posts',
        pageSize: 20,
      });
      setResult(data);
      // 缓存结果
      resultsCacheRef.current.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 处理输入变化
  const handleInputChange = (value: string) => {
    setKeyword(value);
    // 如果清空输入，重置状态
    if (!value.trim()) {
      setResult(null);
      resultsCacheRef.current.clear();
    }
  };

  // 处理回车搜索
  const handlePressEnter = () => {
    if (keyword.trim()) {
      setShowSuggestions(false);
      doSearch(keyword, activeTab);
    }
  };

  // 选择建议项
  const handleSelectSuggestion = (value: string) => {
    setKeyword(value);
    setShowSuggestions(false);
    doSearch(value, activeTab);
  };

  // 自动聚焦
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setKeyword('');
      setResult(null);
      resultsCacheRef.current.clear();
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [open]);

  // Tab 切换 - 优先使用缓存
  useEffect(() => {
    // 只有当已经有搜索结果时才响应 Tab 切换
    if (result && keyword.trim()) {
      const cacheKey = `${keyword.trim()}-${activeTab}`;
      const cached = resultsCacheRef.current.get(cacheKey);

      if (cached) {
        // 有缓存，立即显示
        setResult(cached.data);
        setLoading(false);
      } else {
        // 无缓存，发起搜索
        doSearch(keyword, activeTab);
      }
    }
  }, [activeTab, keyword, result, doSearch]);

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

  // 获取首张图片 URL
  const getFirstImageUrl = (post: Post): string | null => {
    const images = parseImages(post.images);
    if (images.length === 0) return null;

    const firstImage = images[0];

    // 如果是完整 URL，直接返回
    if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
      return firstImage;
    }

    // 处理相对路径
    const filename = firstImage.split('/').pop() || firstImage;
    return `/uploads/posts/${filename}`;
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
          const imageUrl = getFirstImageUrl(post);

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
                        const target = e.target as HTMLImageElement;
                        // 图片加载失败，显示占位符
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.placeholder-icon')) {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'placeholder-icon';
                          placeholder.style.cssText = 'width:80px;height:80px;background:#f5f5f5;borderRadius:8px;display:flex;alignItems:center;justifyContent:center;fontSize:24px;';
                          placeholder.textContent = '🍜';
                          parent.insertBefore(placeholder, target);
                        }
                      }}
                    />
                  ) : (
                    <div className="placeholder-icon" style={{
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
      label: '全部',
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

  // 构建自动补全选项
  const autoCompleteOptions = suggestions.map((item) => ({
    value: item.text,
    label: (
      <Space>
        {item.type === 'location' ? <EnvironmentOutlined /> : <UserOutlined />}
        <Text>{item.text}</Text>
      </Space>
    ),
  }));

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
      <div className="search-header" style={{ position: 'relative' }}>
        <AutoComplete
          value={keyword}
          onChange={handleInputChange}
          onSelect={handleSelectSuggestion}
          options={autoCompleteOptions}
          open={showSuggestions && !result}
          style={{ width: '100%' }}
          placement="bottomLeft"
        >
          <Input
            placeholder="搜索用户、美食、地点... 支持拼音"
            prefix={<SearchOutlined style={{ color: '#999' }} />}
            size="large"
            allowClear
            onPressEnter={handlePressEnter}
            suffix={
              keyword ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {loading ? '搜索中...' : '回车搜索'}
                </Text>
              ) : null
            }
          />
        </AutoComplete>
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
