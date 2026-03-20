import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Avatar, Typography, Tabs, Row, Col, Button, Form, Input,
  Upload, Spin, Empty, message, Modal, Divider,
} from 'antd';
import { UserOutlined, EditOutlined, CameraOutlined } from '@ant-design/icons';
import { getUserById, updateProfile, updateAvatar, changePassword } from '../api/user';
import { getUserPosts, getUserFavorites } from '../api/post';
import { useAuthStore } from '../store/auth';
import PostCard from '../components/PostCard';
import type { User, Post } from '../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function ProfilePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoggedIn, user: me, updateUser } = useAuthStore();
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

  const fetchData = useCallback(async () => {
    if (!viewUserId) { navigate('/login'); return; }
    setLoading(true);
    try {
      const u = await getUserById(viewUserId);
      setProfileUser(u);
      const postsData = await getUserPosts(viewUserId, { pageSize: 50 });
      setMyPosts(postsData.data);
      if (isOwner && isLoggedIn) {
        const favData = await getUserFavorites({ pageSize: 50 });
        setMyFavorites(favData.data);
      }
    } finally {
      setLoading(false);
    }
  }, [viewUserId, isOwner, isLoggedIn, navigate]);

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
    } catch {}
    return false;
  };

  const handleChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
    await changePassword(values);
    void message.success('密码已修改，请重新登录');
    setPwdModalOpen(false);
    pwdForm.resetFields();
  };

  if (!isLoggedIn && !viewUserId) {
    navigate('/login');
    return null;
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!profileUser) return <div style={{ textAlign: 'center', marginTop: 80 }}>用户不存在</div>;

  const PostGrid = ({ posts }: { posts: Post[] }) => (
    posts.length === 0 ? <Empty description="暂无内容" /> : (
      <Row gutter={[16, 16]}>
        {posts.map((p) => (
          <Col key={p.id} xs={24} sm={12} md={8}>
            <PostCard post={p} onUpdate={(u) => {
              setMyPosts((prev) => prev.map((x) => x.id === u.id ? { ...x, ...u } : x));
              setMyFavorites((prev) => prev.map((x) => x.id === u.id ? { ...x, ...u } : x));
            }} />
          </Col>
        ))}
      </Row>
    )
  );

  const tabs = [
    { key: 'posts', label: `动态 (${myPosts.length})`, children: <PostGrid posts={myPosts} /> },
    ...(isOwner ? [{ key: 'favorites', label: `收藏 (${myFavorites.length})`, children: <PostGrid posts={myFavorites} /> }] : []),
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
        <div style={{ position: 'relative' }}>
          <Avatar size={80} src={profileUser.avatar} icon={<UserOutlined />} />
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
                style={{ position: 'absolute', bottom: 0, right: 0 }}
              />
            </Upload>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <Title level={4} style={{ marginBottom: 4 }}>{profileUser.username}</Title>
          <Text type="secondary">{profileUser.bio || '这个人很懒，什么都没写'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            加入于 {new Date(profileUser.createdAt).toLocaleDateString('zh-CN')}
          </Text>
        </div>
        {isOwner && (
          <Button icon={<EditOutlined />} onClick={() => {
            editForm.setFieldsValue({ username: profileUser.username, bio: profileUser.bio });
            setEditModalOpen(true);
          }}>
            编辑资料
          </Button>
        )}
      </div>

      {isOwner && (
        <div style={{ marginBottom: 16 }}>
          <Button type="link" onClick={() => setPwdModalOpen(true)} style={{ padding: 0 }}>
            修改密码
          </Button>
        </div>
      )}

      <Divider />
      <Tabs items={tabs} />

      <Modal title="编辑资料" open={editModalOpen} onCancel={() => setEditModalOpen(false)} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={handleEditProfile} style={{ marginTop: 16 }}>
          <Form.Item label="用户名" name="username" rules={[{ required: true }, { min: 3, max: 20 }]}>
            <Input />
          </Form.Item>
          <Form.Item label="个人简介" name="bio">
            <TextArea rows={3} maxLength={200} showCount />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={editLoading} block>保存</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="修改密码" open={pwdModalOpen} onCancel={() => { setPwdModalOpen(false); pwdForm.resetFields(); }} footer={null}>
        <Form form={pwdForm} layout="vertical" onFinish={handleChangePassword} style={{ marginTop: 16 }}>
          <Form.Item label="当前密码" name="currentPassword" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="新密码" name="newPassword" rules={[{ required: true }, { min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认修改</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
