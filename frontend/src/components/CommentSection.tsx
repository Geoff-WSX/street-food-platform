import { useState, useEffect, useCallback } from 'react';
import { List, Button, Input, message, Typography, Divider, Popconfirm, Tag } from 'antd';
import {
  HeartOutlined, HeartFilled, MessageOutlined,
  DeleteOutlined, LoadingOutlined
} from '@ant-design/icons';
import { getComments, createComment, deleteComment, toggleCommentLike, getCommentReplies, checkContent, type Comment } from '../api/comment';
import { useAuthStore } from '../store/auth';
import { getErrorMessage } from '../utils/error';
import UserAvatar from './common/UserAvatar';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface Props {
  postId: number;
  highlightCommentId?: number;
  onCommentCountChange?: (count: number) => void;
}

export default function CommentSection({ postId, highlightCommentId, onCommentCountChange }: Props) {
  const { isLoggedIn, user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: number; username: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [loadingReplies, setLoadingReplies] = useState<Set<number>>(new Set());

  // 处理评论高亮和滚动
  useEffect(() => {
    if (highlightCommentId) {
      // 延迟执行，确保评论已加载
      setTimeout(() => {
        const element = document.getElementById(`comment-${highlightCommentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // 添加高亮效果
          element.style.background = '#fff7e6';
          element.style.transition = 'background 0.5s ease';
          setTimeout(() => {
            element.style.background = 'transparent';
          }, 2500);
        }
      }, 800);
    }
  }, [highlightCommentId, comments]);

  const loadComments = useCallback(async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      }
      const res = await getComments(postId, { page: pageNum, pageSize: 10 });
      const commentsData = res.data.data || [];
      if (pageNum === 1) {
        setComments(commentsData);
      } else {
        setComments(prev => [...(prev || []), ...commentsData]);
      }
      setHasMore(pageNum < res.data.pagination.totalPages);
      setPage(pageNum);
    } catch {
      void message.error('加载评论失败');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [postId, loadComments]);

  const loadMoreReplies = async (commentId: number) => {
    try {
      setLoadingReplies(prev => new Set(prev).add(commentId));
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      const currentReplyCount = comment.replies?.length || 0;
      const res = await getCommentReplies(commentId, { page: 1, pageSize: currentReplyCount + 10 });

      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            replies: res.data.data || [],
          };
        }
        return c;
      }));

      setExpandedReplies(prev => new Set(prev).add(commentId));
    } catch {
      void message.error('加载回复失败');
    } finally {
      setLoadingReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const handleSubmitComment = async () => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }

    if (!content.trim()) {
      void message.warning('请输入评论内容');
      return;
    }

    if (content.length > 500) {
      void message.warning('评论内容不能超过500字');
      return;
    }

    // 文字审查
    try {
      setSubmitting(true);
      const checkResult = await checkContent(content.trim());
      if (!checkResult.data.valid) {
        void message.error(checkResult.data.message || '内容包含违规词汇，请修改后重试');
        return;
      }
    } catch {
      // 审查失败时继续，不阻止用户发布
    }

    try {
      const res = await createComment({
        postId,
        content: content.trim(),
      });
      const newComment = res.data.data || res.data;
      setComments(prev => {
        const newComments = [newComment, ...prev];
        onCommentCountChange?.(newComments.length);
        return newComments;
      });
      setContent('');
      void message.success('评论成功');
    } catch (error: unknown) {
      void message.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number, parentId?: number) => {
    try {
      await deleteComment(commentId);

      setComments(prev => {
        // 如果是回复，从父评论的 replies 中移除
        if (parentId) {
          return prev.map(c => {
            if (c.id === parentId) {
              const newReplies = (c.replies || []).filter(r => r.id !== commentId);
              return {
                ...c,
                replies: newReplies,
                replyCount: Math.max((c.replyCount || 1) - 1, 0),
              };
            }
            return c;
          });
        }

        // 如果是主评论，直接移除
        const newComments = prev.filter(c => c.id !== commentId);
        onCommentCountChange?.(newComments.length);
        return newComments;
      });

      void message.success('删除成功');
    } catch (error: unknown) {
      void message.error(getErrorMessage(error));
    }
  };

  const handleLikeComment = async (commentId: number) => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }

    try {
      const res = await toggleCommentLike(commentId);
      const { liked, likeCount } = res.data;

      // 更新评论点赞状态
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            isLiked: liked,
            likeCount: likeCount,
          };
        }
        // 同时更新回复中的点赞状态
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map(r => {
              if (r.id === commentId) {
                return {
                  ...r,
                  isLiked: liked,
                  likeCount: likeCount,
                };
              }
              return r;
            }),
          };
        }
        return c;
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      void message.error(errorMessage);
    }
  };

  const handleSubmitReply = async (parentId: number) => {
    if (!isLoggedIn) {
      void message.info('请先登录');
      return;
    }

    if (!replyContent.trim()) {
      void message.warning('请输入回复内容');
      return;
    }

    // 文字审查
    try {
      const checkResult = await checkContent(replyContent.trim());
      if (!checkResult.data.valid) {
        void message.error(checkResult.data.message || '内容包含违规词汇');
        return;
      }
    } catch {
      // 审查失败时继续，不阻止用户发布
    }

    try {
      setReplySubmitting(true);

      // 获取被回复用户的ID
      const parentComment = comments.find(c => c.id === parentId);
      const replyToUserId = parentComment?.user.id;

      const res = await createComment({
        postId,
        content: replyContent.trim(),
        parentId,
        replyToUserId,
      });

      // 添加回复到对应评论
      setComments(prev => prev.map(c => {
        if (c.id === parentId) {
          // 确保 replies 是数组
          const currentReplies = Array.isArray(c.replies) ? c.replies : [];
          const newReply = res.data.data || res.data;
          return {
            ...c,
            replies: [...currentReplies, newReply],
            replyCount: (c.replyCount || 0) + 1,
          };
        }
        return c;
      }));

      setReplyContent('');
      setReplyingTo(null);
      void message.success('回复成功');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '回复失败';
      void message.error(errorMessage);
    } finally {
      setReplySubmitting(false);
    }
  };

  const renderCommentItem = (comment: Comment, isReply: boolean = false) => {
    const isMyComment = user?.id === comment.user.id;
    const isLoadingReplies = loadingReplies.has(comment.id);
    const isExpanded = expandedReplies.has(comment.id);
    const showLoadMore = !isExpanded && (comment.replyCount || 0) > (comment.replies?.length || 0);

    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        style={{
          padding: isReply ? '12px 0' : '16px 0',
          borderBottom: isReply ? 'none' : '1px solid var(--border-color)'
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <UserAvatar
            user={comment.user}
            size={isReply ? 32 : 40}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text strong style={{ fontSize: isReply ? 14 : 15 }}>
                {comment.user.username}
              </Text>
              {comment.replyToUser && (
                <Tag color="blue" style={{ margin: 0, fontSize: 12 }}>
                  回复 @{comment.replyToUser.username}
                </Tag>
              )}
            </div>
            <Paragraph
              style={{
                marginBottom: 8,
                fontSize: isReply ? 14 : 15,
                color: 'var(--text-primary)',
                lineHeight: '1.6'
              }}
            >
              {comment.content}
            </Paragraph>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {new Date(comment.createdAt).toLocaleString('zh-CN')}
              </Text>
              <Button
                type="text"
                size="small"
                icon={comment.isLiked ? <HeartFilled /> : <HeartOutlined />}
                onClick={() => handleLikeComment(comment.id)}
                style={{
                  padding: '4px 8px',
                  height: 'auto',
                  color: comment.isLiked ? '#ff4d4f' : '#8c8c8c',
                  fontSize: 13
                }}
              >
                {comment.likeCount > 0 ? comment.likeCount : '点赞'}
              </Button>
              {!isReply && (
                <Button
                  type="text"
                  size="small"
                  icon={<MessageOutlined />}
                  onClick={() => setReplyingTo({ id: comment.id, username: comment.user.username })}
                  style={{ padding: '4px 8px', height: 'auto', fontSize: 13 }}
                >
                  回复
                </Button>
              )}
              {isMyComment && (
                <Popconfirm
                  title="确定删除这条评论？"
                  onConfirm={() => handleDeleteComment(comment.id, comment.parentId || undefined)}
                  okText="删除"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    danger
                    style={{ padding: '4px 8px', height: 'auto', fontSize: 13 }}
                  >
                    删除
                  </Button>
                </Popconfirm>
              )}
            </div>

            {/* 回复输入框 */}
            {replyingTo?.id === comment.id && (
              <div style={{ marginTop: 12, background: 'var(--bg-secondary)', padding: 12, borderRadius: 12 }}>
                <div style={{ position: 'relative' }}>
                  <TextArea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`回复 @${comment.user.username}...`}
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    maxLength={500}
                    style={{ borderRadius: 8, paddingBottom: 32 }}
                  />
                  <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 12, color: '#999' }}>
                    {replyContent.length}/500
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <Button
                    size="small"
                    onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                    style={{ borderRadius: 6 }}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => handleSubmitReply(comment.id)}
                    loading={replySubmitting}
                    disabled={!replyContent.trim()}
                    style={{ borderRadius: 6 }}
                  >
                    发送
                  </Button>
                </div>
              </div>
            )}

            {/* 显示回复 */}
            {!isReply && comment.replies && comment.replies.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Divider style={{ margin: '8px 0' }} />
                {comment.replies.map(reply => renderCommentItem(reply, true))}
                {showLoadMore && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => loadMoreReplies(comment.id)}
                    loading={isLoadingReplies}
                    style={{ paddingLeft: 0, marginTop: 8 }}
                  >
                    {isLoadingReplies ? '加载中...' : `查看更多回复 (${comment.replyCount! - comment.replies!.length})`}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: 32 }}>
      <Divider style={{ fontSize: 16, fontWeight: 600 }}>
        💬 评论区
      </Divider>

      {/* 评论输入框 */}
      <div style={{ marginBottom: 24, padding: 20, background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <UserAvatar user={user ?? { id: 0, username: '', avatar: null, avatarData: null }} size={40} />
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {isLoggedIn ? (
              <span>{user?.username} <Text type="secondary">，分享你的想法...</Text></span>
            ) : (
              <Text type="secondary">登录后即可发表评论</Text>
            )}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isLoggedIn ? '写下你的评论...（文明发言，友善交流）' : '请先登录后再发表评论'}
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={500}
            style={{ borderRadius: 12, padding: '12px 16px 32px 16px', background: 'var(--card-bg)', resize: 'none' }}
            disabled={!isLoggedIn}
          />
          <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 12, color: content.length > 450 ? '#ff4d4f' : '#999' }}>
            {content.length}/500
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <div style={{ fontSize: 12, color: '#999' }}>
            {content.length > 0 && <Text type="secondary">{content.length} 字</Text>}
          </div>
          <Button
            type="primary"
            onClick={handleSubmitComment}
            loading={submitting}
            disabled={!content.trim() || !isLoggedIn}
            style={{
              borderRadius: 20,
              paddingLeft: 28,
              paddingRight: 28,
              height: 40,
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
            }}
          >
            {isLoggedIn ? '发表评论' : '请先登录'}
          </Button>
        </div>
      </div>

      {/* 评论列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <LoadingOutlined style={{ fontSize: 32, color: 'var(--text-secondary)' }} />
          <div style={{ marginTop: 12, color: 'var(--text-secondary)' }}>加载评论中...</div>
        </div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          <MessageOutlined style={{ fontSize: 48, marginBottom: 12 }} />
          <div>还没有评论，快来抢沙发吧~</div>
        </div>
      ) : (
        <>
          <List
            dataSource={comments}
            renderItem={(comment) => <div>{renderCommentItem(comment)}</div>}
            style={{ background: 'var(--card-bg)', borderRadius: 12 }}
          />
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button
                onClick={() => loadComments(page + 1)}
                style={{ borderRadius: 20 }}
              >
                加载更多评论
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
