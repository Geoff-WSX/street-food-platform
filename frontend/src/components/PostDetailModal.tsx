import { useState, useEffect, useMemo } from 'react';
import { Modal, Avatar, Typography, Button, Empty, Spin } from 'antd';
import { UserOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { getPost } from '../api/post';
import type { Post } from '../types';

const { Text, Paragraph } = Typography;

interface Props {
  postId: number;
  visible: boolean;
  onClose: () => void;
}

export default function PostDetailModal({ postId, visible, onClose }: Props) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);

  // 处理 images 格式：确保是数组
  const processedImages = useMemo(() => {
    if (!post?.images) return [];
    if (Array.isArray(post.images)) return post.images;
    if (typeof post.images === 'string') {
      return post.images.split(',').filter(Boolean);
    }
    return [];
  }, [post?.images]);

  useEffect(() => {
    if (visible && postId) {
      loadPost();
    }
  }, [visible, postId]);

  const loadPost = async () => {
    setLoading(true);
    try {
      const data = await getPost(postId);
      setPost(data);
    } catch (error) {
      console.error('Failed to load post:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={500}
      style={{ top: 20 }}
      bodyStyle={{ padding: 0, backgroundColor: '#1a1a1a' }}
      closeIcon={<div style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>×</div>}
    >
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : post ? (
        <div style={{ color: '#fff' }}>
          {/* 用户信息 */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #333' }}>
            <Avatar
              src={post.user.avatar}
              icon={<UserOutlined />}
              size={48}
              style={{ marginRight: 12 }}
            />
            <div style={{ flex: 1 }}>
              <Text strong style={{ color: '#fff', fontSize: 17 }}>
                {post.user.username}
              </Text>
              {post.address && (
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                  <EnvironmentOutlined style={{ color: '#999', fontSize: 12, marginRight: 4 }} />
                  <Text style={{ color: '#999', fontSize: 13 }}>
                    {post.address}
                  </Text>
                </div>
              )}
            </div>
          </div>

          {/* 内容 */}
          <Paragraph
            style={{
              color: '#fff',
              fontSize: 15,
              lineHeight: '1.8',
              marginBottom: 20,
              minHeight: 60,
            }}
          >
            {post.content}
          </Paragraph>

          {/* 图片 */}
          <div style={{ marginBottom: 20 }}>
            {processedImages.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`post-${index}`}
                style={{
                  width: '100%',
                  borderRadius: 8,
                  marginBottom: index < processedImages.length - 1 ? 12 : 0,
                }}
              />
            ))}
          </div>

          {/* 统计信息 */}
          <div style={{
            display: 'flex',
            gap: 24,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid #333'
          }}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ color: '#ff4d4f', fontSize: 20, fontWeight: 'bold' }}>
                {typeof post.likeCount === 'number' ? post.likeCount : 0}
              </Text>
              <Text style={{ color: '#999', fontSize: 12, display: 'block', marginTop: 4 }}>点赞</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ color: '#faad14', fontSize: 20, fontWeight: 'bold' }}>
                {typeof post.favoriteCount === 'number' ? post.favoriteCount : 0}
              </Text>
              <Text style={{ color: '#999', fontSize: 12, display: 'block', marginTop: 4 }}>收藏</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ color: '#1890ff', fontSize: 20, fontWeight: 'bold' }}>
                {processedImages.length}
              </Text>
              <Text style={{ color: '#999', fontSize: 12, display: 'block', marginTop: 4 }}>图片</Text>
            </div>
          </div>

          {/* 发布时间 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 20,
            color: '#999',
            fontSize: 13
          }}>
            <ClockCircleOutlined style={{ marginRight: 6 }} />
            发布于 {new Date(post.createdAt).toLocaleString('zh-CN')}
          </div>

          {/* 操作按钮 */}
          <div style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              onClick={onClose}
              style={{
                borderRadius: 20,
                width: 120,
                height: 40,
                fontSize: 15
              }}
            >
              关闭
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Empty description="加载失败" />
        </div>
      )}
    </Modal>
  );
}
