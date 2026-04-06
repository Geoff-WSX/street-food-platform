import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Image, Typography, Space, Button, Avatar, Tag, Divider, Popconfirm, message, Card, Skeleton } from 'antd';
import {
  HeartOutlined, HeartFilled, StarOutlined, StarFilled,
  EnvironmentOutlined, UserOutlined, ArrowLeftOutlined, DeleteOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { getPost, toggleLike, toggleFavorite, deletePost } from '../api/post';
import { useAuthStore } from '../store/auth';
import { parseImages } from '../utils/images';
import type { Post } from '../types';
import CommentSection from '../components/CommentSection';
import MapModal from '../components/MapModal';

const { Text, Paragraph } = Typography;

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  // 记录来源页面
  const from = (location.state as any)?.from || '/';
  const [showMapModal, setShowMapModal] = useState(false);

  // 从路由 state 获取需要高亮的评论ID
  const highlightCommentId = location.state?.highlightCommentId;

  // 处理 images 格式：确保是数组
  const processedImages = useMemo(() => {
    return parseImages(post?.images);
  }, [post?.images]);

  useEffect(() => {
    if (!id) return;
    getPost(Number(id))
      .then((data) => {
        setPost(data);
      })
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
    // 根据来源决定跳转目标
    if (from === '/profile') {
      navigate('/profile');
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0 80px', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)', minHeight: '80vh' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <Skeleton.Image active style={{ width: '100%', height: 400, borderRadius: 16 }} />
          <Skeleton active paragraph={{ rows: 3 }} style={{ marginTop: 24 }} />
          <Skeleton active avatar paragraph={{ rows: 2 }} style={{ marginTop: 16 }} />
        </div>
      </div>
    );
  }

  if (!post) return <div style={{ textAlign: 'center', marginTop: 80 }}>动态不存在</div>;

  const isOwner = user?.id === post.user.id;
  const liked = post.isLiked ?? false;
  const favorited = post.isFavorited ?? false;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0 80px', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)', minHeight: '80vh' }}>
      {/* 返回按钮 */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{
          marginBottom: 20,
          borderRadius: 20,
          height: 40,
          paddingLeft: 20,
          paddingRight: 20,
          fontWeight: 500,
          border: '1px solid #e8e8e8'
        }}
      >
        返回
      </Button>

      {/* 主内容卡片 */}
      <Card
        style={{
          borderRadius: 20,
          boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
          border: '1px solid #f0f0f0',
          overflow: 'hidden',
          animation: 'fadeInUp 0.5s ease'
        }}
      >
        {/* 图片展示 */}
        {processedImages.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <Image.PreviewGroup>
              <div style={{
                display: 'grid',
                gridTemplateColumns: processedImages.length === 1 ? '1fr' : processedImages.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                gap: 16
              }}>
                {processedImages.map((img: string, i: number) => (
                  <div key={i} style={{
                    position: 'relative',
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}>
                    <Image
                      src={img}
                      alt={post.content}
                      style={{
                        width: '100%',
                        height: processedImages.length === 1 ? 500 : 300,
                        objectFit: 'cover',
                        display: 'block'
                      }}
                      preview={{
                        mask: <div style={{ color: '#fff' }}>🔍 查看大图</div>
                      }}
                    />
                  </div>
                ))}
              </div>
            </Image.PreviewGroup>
          </div>
        )}

        {/* 内容区域 */}
        <div style={{ padding: '0 8px' }}>
          {/* 标题/内容 */}
          <Paragraph style={{
            fontSize: 18,
            lineHeight: '1.8',
            color: '#262626',
            marginBottom: 20,
            fontWeight: 400
          }}>
            {post.content}
          </Paragraph>

          {/* 标签信息 */}
          <Space wrap style={{ marginBottom: 24 }}>
            {post.address && (
              <Tag
                icon={<EnvironmentOutlined />}
                style={{
                  padding: '6px 14px',
                  borderRadius: 16,
                  fontSize: 14,
                  background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 179, 71, 0.05) 100%)',
                  color: '#ff6b35',
                  border: '1px solid rgba(255, 107, 53, 0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => {
                  if (post.address) {
                    setShowMapModal(true);
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.2) 0%, rgba(255, 179, 71, 0.1) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 179, 71, 0.05) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                📍 {post.address} <span style={{ marginLeft: 4, fontSize: 12, opacity: 0.7 }}>查看地图 →</span>
              </Tag>
            )}
            <Tag
              icon={<ClockCircleOutlined />}
              style={{
                padding: '6px 14px',
                borderRadius: 16,
                fontSize: 14,
                background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(255, 179, 71, 0.04) 100%)',
                color: '#ff6b35',
                border: '1px solid rgba(255, 107, 53, 0.15)'
              }}
            >
              {new Date(post.createdAt).toLocaleString('zh-CN')}
            </Tag>
          </Space>

          <Divider style={{ margin: '24px 0' }} />

          {/* 作者信息 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
            borderRadius: 16,
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar
                src={post.user.avatar}
                icon={<UserOutlined />}
                size={56}
                style={{
                  cursor: 'pointer',
                  border: '3px solid #fff',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
                onClick={() => navigate(`/profile?userId=${post.user.id}`)}
              />
              <div>
                <Text
                  strong
                  style={{
                    fontSize: 16,
                    cursor: 'pointer',
                    color: '#262626'
                  }}
                  onClick={() => navigate(`/profile?userId=${post.user.id}`)}
                >
                  {post.user.username}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  美食探索者
                </Text>
              </div>
            </div>
            {isOwner && (
              <Popconfirm
                title="确定删除这条动态？"
                onConfirm={handleDelete}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  style={{
                    borderRadius: 20,
                    height: 36,
                    paddingLeft: 16,
                    paddingRight: 16
                  }}
                >
                  删除
                </Button>
              </Popconfirm>
            )}
          </div>

          {/* 操作按钮 */}
          <div style={{
            display: 'flex',
            gap: 16,
            padding: '20px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            borderRadius: 16,
            border: '1px solid #f0f0f0'
          }}>
            <Button
              size="large"
              icon={liked ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
              onClick={handleLike}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 24,
                fontWeight: 500,
                background: liked ? 'linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%)' : 'transparent',
                borderColor: liked ? 'transparent' : '#d9d9d9',
                color: liked ? '#fff' : undefined,
                boxShadow: liked ? '0 4px 15px rgba(255, 77, 79, 0.3)' : 'none'
              }}
            >
              {post.likeCount > 0 ? `${post.likeCount} 点赞` : '点赞'}
            </Button>
            <Button
              size="large"
              icon={favorited ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
              onClick={handleFavorite}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 24,
                fontWeight: 500,
                background: favorited ? 'linear-gradient(135deg, #feca57 0%, #ff9f43 100%)' : 'transparent',
                borderColor: favorited ? 'transparent' : '#d9d9d9',
                color: favorited ? '#fff' : undefined,
                boxShadow: favorited ? '0 4px 15px rgba(255, 159, 67, 0.3)' : 'none'
              }}
            >
              {post.favoriteCount > 0 ? `${post.favoriteCount} 收藏` : '收藏'}
            </Button>
          </div>
        </div>
      </Card>

      {/* 评论区 */}
      <Card
        title={`评论区 (${post.commentCount ?? 0})`}
        style={{
          borderRadius: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #f0f0f0',
          marginTop: 24
        }}
      >
        <CommentSection
          postId={Number(id)}
          highlightCommentId={highlightCommentId}
          onCommentCountChange={(count) => {
            setPost(prev => prev ? { ...prev, commentCount: count } : null);
          }}
        />
      </Card>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        /* 图片预览弹窗优化 */
        .ant-image-preview-wrap {
          z-index: 1000;
        }
        .ant-image-preview-mask {
          z-index: 1000;
        }
        .ant-image-preview-operations {
          top: 16px;
        }
        .ant-image-preview-img {
          max-height: 80vh !important;
          object-fit: contain;
        }
      `}</style>

      {/* 地图弹窗 */}
      {post && post.address && (
        <MapModal
          visible={showMapModal}
          onClose={() => setShowMapModal(false)}
          address={post.address}
        />
      )}
    </div>
  );
}
