import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Image, Typography, Space, Button, Avatar, Tag, Divider, Popconfirm, message, Card, Skeleton } from 'antd';
import {
  HeartOutlined, HeartFilled, StarOutlined, StarFilled,
  EnvironmentOutlined, UserOutlined, ArrowLeftOutlined, DeleteOutlined, ClockCircleOutlined, ShareAltOutlined
} from '@ant-design/icons';
import { getPost, toggleLike, toggleFavorite, deletePost } from '../api/post';
import { useAuthStore } from '../store/auth';
import { parseImages, getAvatarUrl } from '../utils/images';
import { useBrowseHistory } from '../hooks/useBrowseHistory';
import type { Post } from '../types';
import CommentSection from '../components/CommentSection';
import MapModal from '../components/MapModal';
import ShareModal from '../components/ShareModal';
import FavoriteFolderSelect from '../components/FavoriteFolderSelect';

const { Text, Paragraph } = Typography;

const calculateReadingStats = (content: string) => {
  const charCount = content.replace(/\s/g, '').length;
  const readingTime = Math.ceil(charCount / 400);
  return { charCount, readingTime: Math.max(1, readingTime) };
};

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user } = useAuthStore();
  const { addToHistory } = useBrowseHistory();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  // 记录来源页面
  const from = (location.state as any)?.from || '/';
  const [showMapModal, setShowMapModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFolderSelect, setShowFolderSelect] = useState(false);

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
        // 添加到浏览历史
        addToHistory(data);
      })
      .finally(() => setLoading(false));
  }, [id, addToHistory]);

  const handleLike = async () => {
    if (!isLoggedIn) { void message.info('请先登录'); navigate('/login'); return; }
    const res = await toggleLike(Number(id));
    setPost((p) => p ? { ...p, isLiked: res.liked, likeCount: res.likeCount } : p);
  };

  const handleFavorite = async () => {
    if (!isLoggedIn) { void message.info('请先登录'); navigate('/login'); return; }
    // 如果已经收藏，取消收藏
    if (post?.isFavorited) {
      const res = await toggleFavorite(Number(id));
      setPost((p) => p ? { ...p, isFavorited: res.favorited, favoriteCount: res.favoriteCount } : p);
    } else {
      // 如果没有收藏，显示文件夹选择
      setShowFolderSelect(true);
    }
  };

  const handleFolderConfirm = async (folderId: number | null) => {
    const res = await toggleFavorite(Number(id), folderId);
    setPost((p) => p ? { ...p, isFavorited: res.favorited, favoriteCount: res.favoriteCount } : p);
    if (res.favorited) {
      void message.success('收藏成功');
    } else {
      void message.success('已取消收藏');
    }
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
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0 80px', minHeight: '80vh' }}>
        <div style={{ borderRadius: 20, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <Skeleton.Image active style={{ width: '100%', height: 400, borderRadius: 16 }} />
          <Skeleton active paragraph={{ rows: 3 }} style={{ marginTop: 24 }} />
          <Skeleton active avatar paragraph={{ rows: 2 }} style={{ marginTop: 16 }} />
        </div>
      </div>
    );
  }

  if (!post) return <div style={{ textAlign: 'center', marginTop: 80 }}>动态不存在</div>;

  const isOwner = user?.id === post.user.id;
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const liked = post.isLiked ?? false;
  const favorited = post.isFavorited ?? false;

  return (
    <div className="post-detail-container" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0 80px', minHeight: '80vh' }}>
      {/* 返回按钮 - 固定在页面左上角 */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        className="post-detail-back-btn"
        style={{
          position: 'fixed',
          top: 70,
          left: 16,
          zIndex: 1000,
          marginBottom: 0,
          borderRadius: 20,
          height: 40,
          paddingLeft: 20,
          paddingRight: 20,
          fontWeight: 500,
          border: '1px solid #e8e8e8',
          background: 'var(--card-bg)',
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
              <div className="post-detail-images" style={{
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
            color: 'var(--text-primary)',
            marginBottom: 20,
            fontWeight: 400
          }}>
            {post.content}
          </Paragraph>

          {/* 阅读统计 */}
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            <span>{calculateReadingStats(post.content).charCount}字</span>
            <span>·</span>
            <span>约{calculateReadingStats(post.content).readingTime}分钟阅读</span>
          </div>

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
            {post.tags && post.tags.map(tag => (
              <Tag
                key={tag.id}
                style={{
                  padding: '6px 14px',
                  borderRadius: 16,
                  fontSize: 14,
                  background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(24, 144, 255, 0.05) 100%)',
                  color: '#1890ff',
                  border: '1px solid rgba(24, 144, 255, 0.2)'
                }}
              >
                #{tag.name}
              </Tag>
            ))}
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
                src={getAvatarUrl(post.user)}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Text
                    strong
                    style={{
                      fontSize: 16,
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                    onClick={() => navigate(`/profile?userId=${post.user.id}`)}
                  >
                    {post.user.username}
                  </Text>
                  {post.user.level && (
                    <Tag
                      style={{
                        fontSize: 12,
                        padding: '0 6px',
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 179, 71, 0.05) 100%)',
                        color: '#ff6b35',
                        border: '1px solid rgba(255, 107, 53, 0.2)'
                      }}
                    >
                      {post.user.level.icon} {post.user.level.name}
                    </Tag>
                  )}
                </div>
                {post.user.bio && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {post.user.bio}
                  </Text>
                )}
              </div>
            </div>
            {(isOwner || isAdmin) && (
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
          <div className="post-action-buttons" style={{
            display: 'flex',
            gap: 16,
            padding: '20px',
            borderRadius: 16,
            border: '1px solid var(--border-color)'
          }}>
            <Button
              size="large"
              icon={liked ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
              onClick={handleLike}
              className="post-action-btn"
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
              className="post-action-btn"
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
            <Button
              size="large"
              icon={<ShareAltOutlined />}
              onClick={() => setShowShareModal(true)}
              className="post-action-btn"
              style={{
                flex: 1,
                height: 48,
                borderRadius: 24,
                fontWeight: 500,
                background: 'transparent',
                borderColor: '#d9d9d9'
              }}
            >
              分享
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
        /* 响应式图片网格 */
        .post-detail-images {
          width: 100%;
        }
        @media (max-width: 768px) {
          .post-detail-images {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .post-detail-images > div {
            border-radius: 12px !important;
          }
          .post-detail-container {
            padding: 16px 8px 60px !important;
          }
          .post-action-buttons {
            gap: 8px !important;
            padding: 12px !important;
          }
          .post-action-btn {
            height: 42px !important;
            font-size: 13px !important;
          }
        }
        @media (max-width: 480px) {
          .post-detail-images {
            grid-template-columns: 1fr !important;
            gap: 6px !important;
          }
          .post-detail-back-btn {
            top: 70px !important;
            left: 8px !important;
            height: 36px !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
            font-size: 13px !important;
          }
          .post-action-buttons {
            flex-wrap: wrap !important;
            gap: 8px !important;
            padding: 12px !important;
          }
          .post-action-btn {
            min-width: calc(50% - 4px) !important;
            flex: none !important;
            width: calc(50% - 4px) !important;
            height: 40px !important;
          }
          .post-action-btn:last-child {
            width: 100% !important;
          }
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

      {/* 分享弹窗 */}
      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        postId={post.id}
        postContent={post.content}
        isOwnPost={post.user?.id === user?.id}
      />

      {/* 收藏文件夹选择 */}
      <FavoriteFolderSelect
        visible={showFolderSelect}
        onClose={() => setShowFolderSelect(false)}
        onConfirm={handleFolderConfirm}
      />
    </div>
  );
}
