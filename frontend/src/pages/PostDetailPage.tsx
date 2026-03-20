import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Image, Typography, Space, Button, Avatar, Tag, Divider, Popconfirm, message } from 'antd';
import {
  HeartOutlined, HeartFilled, StarOutlined, StarFilled,
  EnvironmentOutlined, UserOutlined, ArrowLeftOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { getPost, toggleLike, toggleFavorite, deletePost } from '../api/post';
import { useAuthStore } from '../store/auth';
import type { Post } from '../types';

const { Title, Text } = Typography;

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getPost(Number(id))
      .then(setPost)
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    if (!isLoggedIn) { void message.info('请先登录'); navigate('/login'); return; }
    const res = await toggleLike(Number(id));
    setPost((p) => p ? { ...p, isLiked: res.liked, likeCount: res.likeCount } : p);
  };

  const handleFavorite = async () => {
    if (!isLoggedIn) { void message.info('请先登录'); navigate('/login'); return; }
    const res = await toggleFavorite(Number(id));
    setPost((p) => p ? { ...p, isFavorited: res.favorited, favoriteCount: res.favoriteCount } : p);
  };

  const handleDelete = async () => {
    await deletePost(Number(id));
    void message.success('已删除');
    navigate('/');
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!post) return <div style={{ textAlign: 'center', marginTop: 80 }}>动态不存在</div>;

  const isOwner = user?.id === post.user.id;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 0' }}>
      <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        返回
      </Button>

      {post.images.length > 0 && (
        <Image.PreviewGroup>
          <Space wrap style={{ marginBottom: 24 }}>
            {post.images.map((img, i) => (
              <Image key={i} src={img} width={post.images.length === 1 ? '100%' : 200} style={{ borderRadius: 8 }} />
            ))}
          </Space>
        </Image.PreviewGroup>
      )}

      <Space align="center" style={{ marginBottom: 16 }}>
        <Avatar
          src={post.user.avatar}
          icon={<UserOutlined />}
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/profile?userId=${post.user.id}`)}
        />
        <div>
          <Text
            strong
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/profile?userId=${post.user.id}`)}
          >
            {post.user.username}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(post.createdAt).toLocaleString('zh-CN')}
          </Text>
        </div>
        {isOwner && (
          <Popconfirm title="确定删除这条动态？" onConfirm={handleDelete} okText="删除" cancelText="取消">
            <Button danger icon={<DeleteOutlined />} size="small" type="text" />
          </Popconfirm>
        )}
      </Space>

      <Title level={5} style={{ marginBottom: 8 }}>{post.content}</Title>

      {post.address && (
        <Tag icon={<EnvironmentOutlined />} color="orange" style={{ marginBottom: 16 }}>
          {post.address}
        </Tag>
      )}

      <Divider />

      <Space size="large">
        <Button
          icon={post.isLiked ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
          onClick={handleLike}
        >
          {post.likeCount} 点赞
        </Button>
        <Button
          icon={post.isFavorited ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
          onClick={handleFavorite}
        >
          {post.favoriteCount} 收藏
        </Button>
      </Space>
    </div>
  );
}
