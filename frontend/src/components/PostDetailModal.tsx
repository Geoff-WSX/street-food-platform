import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Avatar, Typography, Button, Empty, Spin } from 'antd';
import { UserOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { getPost } from '../api/post';
import { parseImages } from '../utils/images';
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
    return parseImages(post?.images);
  }, [post?.images]);

  const loadPost = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPost(postId);
      setPost(data);
    } catch {
      // 忽略错误
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (visible && postId) {
      loadPost();
    }
  }, [visible, postId, loadPost]);

  if (!visible) return null;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={500}
      style={{ top: 80 }}
      bodyStyle={{ padding: 0, backgroundColor: '#1a1a1a', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}
      closeIcon={<div style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>×</div>}
    >
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : post ? (
        <div style={{ color: '#fff', paddingBottom: 20 }}>
          {/* 用户信息 */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, padding: '20px 20px 16px', borderBottom: '1px solid #333', position: 'sticky', top: 0, background: '#1a1a1a', zIndex: 1 }}>
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
            <Button
              type="primary"
              size="small"
              onClick={onClose}
              style={{ borderRadius: 16 }}
            >
              关闭
            </Button>
          </div>

          {/* 内容 */}
          <Paragraph
            style={{
              color: '#fff',
              fontSize: 15,
              lineHeight: '1.8',
              padding: '0 20px',
              marginBottom: 16,
            }}
          >
            {post.content}
          </Paragraph>

          {/* 图片 */}
          <div style={{ padding: '0 20px', marginBottom: 16 }}>
            {processedImages.map((img: string, index: number) => (
              <img
                key={index}
                src={img}
                alt={`post-${index}`}
                style={{
                  width: '100%',
                  maxHeight: 400,
                  objectFit: 'cover',
                  borderRadius: 12,
                  marginBottom: index < processedImages.length - 1 ? 12 : 0,
                  display: 'block'
                }}
              />
            ))}
          </div>

          {/* 统计信息 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            padding: '16px 20px',
            borderTop: '1px solid #333',
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
              <Text style={{ color: '#52c41a', fontSize: 20, fontWeight: 'bold' }}>
                {typeof post.commentCount === 'number' ? post.commentCount : 0}
              </Text>
              <Text style={{ color: '#999', fontSize: 12, display: 'block', marginTop: 4 }}>评论</Text>
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
            justifyContent: 'center',
            padding: '16px 20px',
            color: '#999',
            fontSize: 13
          }}>
            <ClockCircleOutlined style={{ marginRight: 6 }} />
            发布于 {new Date(post.createdAt).toLocaleString('zh-CN')}
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
