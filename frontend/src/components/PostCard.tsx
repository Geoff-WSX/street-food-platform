import { useState } from 'react';
import { Card, Image, Space, Button, Avatar, Typography, message } from 'antd';
import { HeartOutlined, HeartFilled, StarOutlined, StarFilled, EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { toggleLike, toggleFavorite } from '../api/post';
import { useAuthStore } from '../store/auth';
import type { Post } from '../types';

const { Text, Paragraph } = Typography;

interface Props {
  post: Post;
  onUpdate?: (updated: Partial<Post> & { id: number }) => void;
}

export default function PostCard({ post, onUpdate }: Props) {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [favorited, setFavorited] = useState(post.isFavorited ?? false);
  const [likesCount, setLikesCount] = useState(post.likeCount);
  const [favoritesCount, setFavoritesCount] = useState(post.favoriteCount);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) { void message.info('请先登录'); navigate('/login'); return; }
    try {
      const res = await toggleLike(post.id);
      setLiked(res.liked);
      setLikesCount(res.likeCount);
      onUpdate?.({ id: post.id, isLiked: res.liked, likeCount: res.likeCount });
    } catch {}
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) { void message.info('请先登录'); navigate('/login'); return; }
    try {
      const res = await toggleFavorite(post.id);
      setFavorited(res.favorited);
      setFavoritesCount(res.favoriteCount);
      onUpdate?.({ id: post.id, isFavorited: res.favorited, favoriteCount: res.favoriteCount });
    } catch {}
  };

  return (
    <Card
      hoverable
      style={{ marginBottom: 16 }}
      cover={
        post.images.length > 0 ? (
          <div onClick={() => navigate(`/post/${post.id}`)} style={{ cursor: 'pointer', overflow: 'hidden' }}>
            <img
              src={post.images[0]}
              alt="post"
              style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
            />
          </div>
        ) : null
      }
      onClick={() => navigate(`/post/${post.id}`)}
    >
      <Card.Meta
        avatar={
          <Avatar
            src={post.user.avatar}
            icon={<UserOutlined />}
            onClick={(e) => { e.stopPropagation(); navigate(`/profile?userId=${post.user.id}`); }}
            style={{ cursor: 'pointer' }}
          />
        }
        title={
          <Text
            onClick={(e) => { e.stopPropagation(); navigate(`/profile?userId=${post.user.id}`); }}
            style={{ cursor: 'pointer' }}
          >
            {post.user.username}
          </Text>
        }
        description={
          <Space direction="vertical" style={{ width: '100%' }}>
            <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
              {post.content}
            </Paragraph>
            {post.address && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <EnvironmentOutlined /> {post.address}
              </Text>
            )}
          </Space>
        }
      />
      <Space style={{ marginTop: 12 }} onClick={(e) => e?.stopPropagation()}>
        <Button
          type="text"
          size="small"
          icon={liked ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
          onClick={handleLike}
        >
          {likesCount}
        </Button>
        <Button
          type="text"
          size="small"
          icon={favorited ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
          onClick={handleFavorite}
        >
          {favoritesCount}
        </Button>
      </Space>
    </Card>
  );
}
