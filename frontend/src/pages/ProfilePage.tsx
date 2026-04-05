import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Avatar, Typography, Row, Col, Button, Form, Input,
  Upload, Spin, Empty, message, Modal, Divider, Card, Space, Tag, Select, Switch, List, Popconfirm
} from 'antd';
import { UserOutlined, EditOutlined, CameraOutlined, EnvironmentOutlined, LogoutOutlined, StopOutlined, MessageOutlined, UserAddOutlined, CheckOutlined, MessageOutlined as MessageIcon, WarningOutlined } from '@ant-design/icons';
import { getUserById, updateProfile, updateAvatar, changePassword, updateMessageSettings } from '../api/user';
import { getUserPosts, getUserFavorites } from '../api/post';
import { getBlockedList, unblockUser } from '../api/block';
import { getFollowing, getFollowers, followUser, unfollowUser, checkFollowStatus } from '../api/follow';
import { useAuthStore } from '../store/auth';
import PostCard from '../components/PostCard';
import ChatModal from '../components/ChatModal';
import ReportModal from '../components/ReportModal';
import type { User, Post } from '../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// 城市列表
const CITIES = [
  { name: '全部', value: '' },
  { name: '杭州', value: '杭州' },
  { name: '上海', value: '上海' },
  { name: '北京', value: '北京' },
  { name: '广州', value: '广州' },
  { name: '深圳', value: '深圳' },
  { name: '成都', value: '成都' },
  { name: '重庆', value: '重庆' },
  { name: '武汉', value: '武汉' },
  { name: '西安', value: '西安' },
];

export default function ProfilePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoggedIn, user: me, updateUser, logout } = useAuthStore();
  const viewUserId = searchParams.get('userId') ? Number(searchParams.get('userId')) : me?.id;
  const isOwner = !searchParams.get('userId') || Number(searchParams.get('userId')) === me?.id;

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myFavorites, setMyFavorites] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [activeTab, setActiveTab] = useState('posts');
  const [allowMessage, setAllowMessage] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [following, setFollowing] = useState<User[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [followLoading, setFollowLoading] = useState(false);
  const [followingStatus, setFollowingStatus] = useState<Record<number, boolean>>({});
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!viewUserId) { navigate('/login'); return; }
    setLoading(true);
    try {
      const u = await getUserById(viewUserId);
      setProfileUser(u);
      setAllowMessage(u.allowMessage ?? true);
      const postsData = await getUserPosts(viewUserId, { pageSize: 50 });
      setMyPosts(postsData.data);

      // 获取关注和粉丝列表
      const [followingData, followersData] = await Promise.all([
        getFollowing(viewUserId),
        getFollowers(viewUserId)
      ]);
      setFollowing(followingData);
      setFollowers(followersData);

      // 检查关注状态
      if (isLoggedIn && me) {
        const statusMap: Record<number, boolean> = {};
        await Promise.all(
          [...followingData, ...followersData].map(async (user) => {
            try {
              const status = await checkFollowStatus(user.id);
              statusMap[user.id] = status.isFollowing;
            } catch {
              statusMap[user.id] = false;
            }
          })
        );
        setFollowingStatus(statusMap);
      }

      if (isOwner && isLoggedIn) {
        const favData = await getUserFavorites({ pageSize: 50 });
        setMyFavorites(favData.data);
        // 获取黑名单
        const blocked = await getBlockedList();
        setBlockedUsers(blocked);
      }
    } finally {
      setLoading(false);
    }
  }, [viewUserId, isOwner, isLoggedIn, navigate, me]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEditProfile = async (values: { username: string; bio?: string }) => {
    setEditLoading(true);
    try {
      const updated = await updateProfile(values);
      updateUser(updated);
      setProfileUser(updated);
      setEditModalOpen(false);
      void message.success('资料已更新');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAvatarChange = async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const updated = await updateAvatar(formData);
      updateUser(updated);
      setProfileUser(updated);
      void message.success('头像已更新');
    } catch {
      // 忽略错误
    }
    return false;
  };

  const handleChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
    await changePassword(values);
    void message.success('密码已修改，请重新登录');
    setPwdModalOpen(false);
    pwdForm.resetFields();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleMessageSettingChange = async (checked: boolean) => {
    try {
      const updated = await updateMessageSettings(checked);
      setAllowMessage(checked);
      updateUser(updated);
      void message.success(checked ? '已开启私信功能' : '已关闭私信功能');
    } catch {
      void message.error('设置失败');
    }
  };

  const handleUnblock = async (userId: number) => {
    try {
      await unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      void message.success('已取消拉黑');
    } catch {
      void message.error('操作失败');
    }
  };

  const loadBlockedUsers = async () => {
    setBlockedLoading(true);
    try {
      const blocked = await getBlockedList();
      setBlockedUsers(blocked);
    } finally {
      setBlockedLoading(false);
    }
  };

  const handleFollowUser = async (userId: number) => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }
    setFollowLoading(true);
    try {
      await followUser(userId);
      setFollowingStatus(prev => ({ ...prev, [userId]: true }));
      void message.success('关注成功');
    } catch {
      void message.error('操作失败');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollowUser = async (userId: number) => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }
    setFollowLoading(true);
    try {
      await unfollowUser(userId);
      setFollowingStatus(prev => ({ ...prev, [userId]: false }));
      // 如果在关注列表中，从列表中移除
      setFollowing(prev => prev.filter(u => u.id !== userId));
      // 如果在粉丝列表中，移除该用户
      setFollowers(prev => prev.filter(u => u.id !== userId));
      void message.success('已取消关注');
    } catch {
      void message.error('操作失败');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleOpenChat = (user: User) => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }
    setChatUser(user);
    setShowChatModal(true);
  };

  // 渲染用户列表项
  const renderUserItem = (user: User) => (
    <List.Item
      key={user.id}
      style={{
        padding: '12px 16px',
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#fafafa',
        border: '1px solid #f0f0f0'
      }}
    >
      <List.Item.Meta
        avatar={
          <Avatar
            src={user.avatar}
            icon={<UserOutlined />}
            size={48}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/profile?userId=${user.id}`)}
          />
        }
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              strong
              style={{ fontSize: 15, cursor: 'pointer' }}
              onClick={() => navigate(`/profile?userId=${user.id}`)}
            >
              {user.username}
            </Text>
            {isLoggedIn && me && user.id !== me.id && (
              <Space size={8}>
                {followingStatus[user.id] ? (
                  <Button
                    icon={<CheckOutlined />}
                    onClick={() => handleUnfollowUser(user.id)}
                    loading={followLoading}
                    size="small"
                  >
                    已关注
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={() => handleFollowUser(user.id)}
                    loading={followLoading}
                    size="small"
                  >
                    关注
                  </Button>
                )}
                <Button
                  icon={<MessageIcon />}
                  onClick={() => handleOpenChat(user)}
                  size="small"
                >
                  私信
                </Button>
              </Space>
            )}
          </div>
        }
        description={
          <Text type="secondary" style={{ fontSize: 13 }}>
            {user.bio || '这个人很懒，什么都没写'}
          </Text>
        }
      />
    </List.Item>
  );

  if (!isLoggedIn && !viewUserId) {
    navigate('/login');
    return null;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', background: 'linear-gradient(180deg, #faf8ff 0%, #ffffff 100%)' }}>
        <Space direction="vertical" style={{ gap: 16, textAlign: 'center' }}>
          <Spin size="large" />
          <Text type="secondary" style={{ fontSize: 15 }}>加载个人主页中...</Text>
        </Space>
      </div>
    );
  }
  if (!profileUser) return <div style={{ textAlign: 'center', marginTop: 80 }}>用户不存在</div>;

  // 根据城市过滤
  const filterByCity = (posts: Post[]) => {
    if (!selectedCity) return posts;
    return posts.filter(post => {
      const address = post.address || '';
      return address.includes(selectedCity);
    });
  };

  const filteredPosts = filterByCity(myPosts);
  const filteredFavorites = filterByCity(myFavorites);

  const PostGrid = ({ posts }: { posts: Post[] }) => (
    posts.length === 0 ? (
      <Empty
        description={selectedCity ? `${selectedCity}暂无内容` : '暂无内容'}
        style={{ padding: '40px 0' }}
      />
    ) : (
      <Row gutter={[16, 16]}>
        {posts.map((p) => (
          <Col key={p.id} xs={24} sm={12} md={8} lg={6}>
            <PostCard post={p} onUpdate={(u) => {
              setMyPosts((prev) => prev.map((x) => x.id === u.id ? { ...x, ...u } : x));
              setMyFavorites((prev) => prev.map((x) => x.id === u.id ? { ...x, ...u } : x));
            }} />
          </Col>
        ))}
      </Row>
    )
  );

  const tabItems = [
    {
      key: 'posts',
      label: `动态 ${myPosts.length > 0 ? `(${myPosts.length})` : ''}`,
      children: (
        <>
          {/* 城市筛选 */}
          {myPosts.length > 0 && (
            <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
              <Space size={12}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <EnvironmentOutlined /> 筛选城市：
                </Text>
                <Select
                  value={selectedCity}
                  onChange={setSelectedCity}
                  style={{ width: 100 }}
                  size="small"
                >
                  {CITIES.map(city => (
                    <Option key={city.value} value={city.value}>{city.name}</Option>
                  ))}
                </Select>
                {selectedCity && (
                  <Tag closable onClose={() => setSelectedCity('')} style={{ borderRadius: 12 }}>
                    {selectedCity} ({filteredPosts.length})
                  </Tag>
                )}
              </Space>
            </Card>
          )}
          <PostGrid posts={filteredPosts} />
        </>
      )
    },
    {
      key: 'following',
      label: `关注 ${following.length > 0 ? `(${following.length})` : ''}`,
      children: (
        following.length === 0 ? (
          <Empty description="暂无关注" style={{ padding: '40px 0' }} />
        ) : (
          <List
            dataSource={following}
            renderItem={(user) => renderUserItem(user)}
          />
        )
      )
    },
    {
      key: 'followers',
      label: `粉丝 ${followers.length > 0 ? `(${followers.length})` : ''}`,
      children: (
        followers.length === 0 ? (
          <Empty description="暂无粉丝" style={{ padding: '40px 0' }} />
        ) : (
          <List
            dataSource={followers}
            renderItem={(user) => renderUserItem(user)}
          />
        )
      )
    },
    ...(isOwner ? [{
      key: 'favorites',
      label: `收藏 ${myFavorites.length > 0 ? `(${myFavorites.length})` : ''}`,
      children: (
        <>
          {myFavorites.length > 0 && (
            <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
              <Space size={12}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <EnvironmentOutlined /> 筛选城市：
                </Text>
                <Select
                  value={selectedCity}
                  onChange={setSelectedCity}
                  style={{ width: 100 }}
                  size="small"
                >
                  {CITIES.map(city => (
                    <Option key={city.value} value={city.value}>{city.name}</Option>
                  ))}
                </Select>
                {selectedCity && (
                  <Tag closable onClose={() => setSelectedCity('')} style={{ borderRadius: 12 }}>
                    {selectedCity} ({filteredFavorites.length})
                  </Tag>
                )}
              </Space>
            </Card>
          )}
          <PostGrid posts={filteredFavorites} />
        </>
      )
    }, {
      key: 'settings',
      label: '设置',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {/* 私信设置 */}
          <Card title="私信设置" size="small" style={{ borderRadius: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <MessageOutlined />
                  <Text>允许其他人给我发送私信</Text>
                </Space>
                <Switch
                  checked={allowMessage}
                  onChange={handleMessageSettingChange}
                  checkedChildren="开"
                  unCheckedChildren="关"
                />
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                关闭后，其他用户无法给你发送私信
              </Text>
            </Space>
          </Card>

          {/* 黑名单管理 */}
          <Card
            title="黑名单"
            size="small"
            style={{ borderRadius: 8 }}
            extra={
              <Button
                icon={<StopOutlined />}
                onClick={loadBlockedUsers}
                loading={blockedLoading}
              >
                刷新
              </Button>
            }
          >
            {blockedUsers.length === 0 ? (
              <Empty
                description="黑名单为空"
                style={{ padding: '20px 0' }}
              />
            ) : (
              <List
                dataSource={blockedUsers}
                renderItem={(user) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        title="确定要取消拉黑吗？"
                        onConfirm={() => handleUnblock(user.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button type="link" danger>
                          取消拉黑
                        </Button>
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          src={user.avatar}
                          icon={<UserOutlined />}
                          size={40}
                        />
                      }
                      title={user.username}
                      description={user.bio || '这个人很懒，什么都没写'}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Space>
      )
    }] : []),
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0 80px', background: 'linear-gradient(180deg, #faf8ff 0%, #ffffff 100%)', minHeight: '80vh' }}>
      {/* 用户信息卡片 */}
      <Card
        style={{
          borderRadius: 20,
          marginBottom: 24,
          boxShadow: '0 8px 30px rgba(102, 126, 234, 0.12)',
          border: '1px solid rgba(102, 126, 234, 0.1)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f6ff 100%)',
          overflow: 'hidden'
        }}
      >
        {/* 顶部装饰条 */}
        <div style={{
          height: 80,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          borderRadius: '20px 20px 0 0'
        }} />
        <Row gutter={[32, 24]} align="middle" style={{ paddingTop: 20 }}>
          <Col flex="none" style={{ zIndex: 1 }}>
            <div style={{ position: 'relative' }}>
              <Avatar
                size={120}
                src={profileUser.avatar}
                icon={<UserOutlined />}
                style={{
                  border: '5px solid #fff',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                }}
              />
              {isOwner && (
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={(file) => { void handleAvatarChange(file); return false; }}
                >
                  <Button
                    icon={<CameraOutlined />}
                    size="small"
                    shape="circle"
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: '2px solid #fff',
                      color: '#fff'
                    }}
                  />
                </Upload>
              )}
            </div>
          </Col>
          <Col flex="auto" style={{ zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Title level={2} style={{ marginBottom: 12, marginTop: 0, fontSize: 28, fontWeight: 700 }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {profileUser.username}
                  </span>
                </Title>
                <Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ marginBottom: 16, fontSize: 15, color: '#595959', maxWidth: 450, lineHeight: '1.6' }}
                >
                  {profileUser.bio || '这个人很懒，什么都没写 😊'}
                </Paragraph>
                <Space split={<Divider type="vertical" style={{ margin: '0 8px' }} />} size="middle">
                  <div
                    style={{
                      cursor: 'pointer',
                      padding: '8px 16px',
                      borderRadius: 20,
                      background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(24, 144, 255, 0.05) 100%)',
                      border: '1px solid rgba(24, 144, 255, 0.2)',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => setActiveTab('posts')}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(24, 144, 255, 0.15) 0%, rgba(24, 144, 255, 0.1) 100%)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(24, 144, 255, 0.05) 100%)'}
                  >
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      动态 <Text strong style={{ color: '#1890ff', fontSize: 16 }}> {myPosts.length}</Text>
                    </Text>
                  </div>
                  <div
                    style={{
                      cursor: 'pointer',
                      padding: '8px 16px',
                      borderRadius: 20,
                      background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.1) 0%, rgba(82, 196, 26, 0.05) 100%)',
                      border: '1px solid rgba(82, 196, 26, 0.2)',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => setActiveTab('following')}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(82, 196, 26, 0.15) 0%, rgba(82, 196, 26, 0.1) 100%)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(82, 196, 26, 0.1) 0%, rgba(82, 196, 26, 0.05) 100%)'}
                  >
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      关注 <Text strong style={{ color: '#52c41a', fontSize: 16 }}> {following.length}</Text>
                    </Text>
                  </div>
                  <div
                    style={{
                      cursor: 'pointer',
                      padding: '8px 16px',
                      borderRadius: 20,
                      background: 'linear-gradient(135deg, rgba(250, 173, 20, 0.1) 0%, rgba(250, 173, 20, 0.05) 100%)',
                      border: '1px solid rgba(250, 173, 20, 0.2)',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => setActiveTab('followers')}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(250, 173, 20, 0.15) 0%, rgba(250, 173, 20, 0.1) 100%)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(250, 173, 20, 0.1) 0%, rgba(250, 173, 20, 0.05) 100%)'}
                  >
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      粉丝 <Text strong style={{ color: '#faad14', fontSize: 16 }}> {followers.length}</Text>
                    </Text>
                  </div>
                  {isOwner && (
                    <div
                      style={{
                        cursor: 'pointer',
                        padding: '8px 16px',
                        borderRadius: 20,
                        background: 'linear-gradient(135deg, rgba(114, 46, 209, 0.1) 0%, rgba(114, 46, 209, 0.05) 100%)',
                        border: '1px solid rgba(114, 46, 209, 0.2)',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => setActiveTab('favorites')}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(114, 46, 209, 0.15) 0%, rgba(114, 46, 209, 0.1) 100%)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(114, 46, 209, 0.1) 0%, rgba(114, 46, 209, 0.05) 100%)'}
                    >
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        收藏 <Text strong style={{ color: '#722ed1', fontSize: 16 }}> {myFavorites.length}</Text>
                      </Text>
                    </div>
                  )}
                  <Text type="secondary" style={{ fontSize: 13, color: '#8c8c8c' }}>
                    📅 {new Date(profileUser.createdAt).toLocaleDateString('zh-CN')} 加入
                  </Text>
                </Space>
              </div>
              {!isOwner && profileUser && (
                <Space>
                  <Button
                    icon={<MessageOutlined />}
                    onClick={() => handleOpenChat(profileUser)}
                    style={{
                      borderRadius: 20,
                      height: 40,
                      paddingLeft: 20,
                      paddingRight: 20,
                      fontWeight: 500,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      color: '#fff'
                    }}
                  >
                    私信
                  </Button>
                  <Button
                    icon={<WarningOutlined />}
                    danger
                    onClick={() => setReportModalOpen(true)}
                    style={{ borderRadius: 20, height: 40 }}
                  >
                    举报
                  </Button>
                </Space>
              )}
              {isOwner && (
                <Space>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => {
                      editForm.setFieldsValue({ username: profileUser.username, bio: profileUser.bio });
                      setEditModalOpen(true);
                    }}
                    style={{
                      borderRadius: 20,
                      height: 40,
                      fontWeight: 500
                    }}
                  >
                    编辑资料
                  </Button>
                  <Button
                    onClick={() => setPwdModalOpen(true)}
                    style={{ borderRadius: 20, height: 40 }}
                  >
                    修改密码
                  </Button>
                  <Button
                    icon={<LogoutOutlined />}
                    onClick={handleLogout}
                    danger
                    style={{ borderRadius: 20, height: 40 }}
                  >
                    退出登录
                  </Button>
                </Space>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      {/* 标签页 */}
      <Card
        style={{
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #f0f0f0'
        }}
        tabList={tabItems.map(item => ({ key: item.key, tab: item.label }))}
        activeTabKey={activeTab}
        onTabChange={setActiveTab}
      >
        {tabItems.find(item => item.key === activeTab)?.children}
      </Card>

      {/* 编辑资料弹窗 */}
      <Modal
        title="编辑资料"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        width={400}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditProfile} style={{ marginTop: 16 }}>
          <Form.Item label="用户名" name="username" rules={[{ required: true }, { min: 3, max: 20 }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item label="个人简介" name="bio">
            <TextArea rows={3} maxLength={200} showCount placeholder="介绍一下自己..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={editLoading} block size="large">
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={pwdModalOpen}
        onCancel={() => { setPwdModalOpen(false); pwdForm.resetFields(); }}
        footer={null}
        width={400}
      >
        <Form form={pwdForm} layout="vertical" onFinish={handleChangePassword} style={{ marginTop: 16 }}>
          <Form.Item label="当前密码" name="currentPassword" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item label="新密码" name="newPassword" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}>
            <Input.Password placeholder="请输入新密码（至少6位）" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              确认修改
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 私信弹窗 */}
      {showChatModal && chatUser && (
        <ChatModal
          visible={showChatModal}
          onClose={() => setShowChatModal(false)}
          otherUser={chatUser}
        />
      )}

      {/* 举报弹窗 */}
      {profileUser && !isOwner && (
        <ReportModal
          open={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          reportedUserId={profileUser.id}
          reportedUsername={profileUser.username}
        />
      )}
    </div>
  );
}
