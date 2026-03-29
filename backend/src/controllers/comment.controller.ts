import { Response } from 'express';
import { AuthRequest } from '../types';
import {
  getComments,
  getCommentReplies,
  createComment,
  deleteComment,
  toggleCommentLike,
} from '../services/comment.service';

/**
 * 获取动态的评论列表
 */
export const getPostComments = async (req: AuthRequest, res: Response) => {
  try {
    const postId = Number(req.params.postId);
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const userId = req.user?.userId;

    if (isNaN(postId)) {
      return res.status(400).json({ message: '动态ID无效' });
    }

    const result = await getComments(postId, page, pageSize, userId);
    res.json(result);
  } catch (error: any) {
    console.error('获取评论失败:', error);
    res.status(500).json({ message: error.message || '获取评论失败' });
  }
};

/**
 * 获取评论的回复列表
 */
export const getCommentRepliesHandler = async (req: AuthRequest, res: Response) => {
  try {
    const commentId = Number(req.params.commentId);
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const userId = req.user?.userId;

    if (isNaN(commentId)) {
      return res.status(400).json({ message: '评论ID无效' });
    }

    const result = await getCommentReplies(commentId, page, pageSize, userId);
    res.json(result);
  } catch (error: any) {
    console.error('获取回复失败:', error);
    res.status(500).json({ message: error.message || '获取回复失败' });
  }
};

/**
 * 创建评论
 */
export const createCommentHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { postId, content, parentId, replyToUserId } = req.body;

    if (!postId || !content || content.trim().length === 0) {
      return res.status(400).json({ message: '动态ID和评论内容不能为空' });
    }

    if (content.length > 500) {
      return res.status(400).json({ message: '评论内容不能超过500字' });
    }

    const comment = await createComment(userId, {
      postId: Number(postId),
      content: content.trim(),
      parentId: parentId ? Number(parentId) : undefined,
      replyToUserId: replyToUserId ? Number(replyToUserId) : undefined,
    });

    res.status(201).json({
      message: '评论成功',
      data: comment,
    });
  } catch (error: any) {
    console.error('创建评论失败:', error);
    res.status(400).json({ message: error.message || '创建评论失败' });
  }
};

/**
 * 删除评论
 */
export const deleteCommentHandler = async (req: AuthRequest, res: Response) => {
  try {
    const commentId = Number(req.params.commentId);
    const userId = req.user!.userId;
    const userRole = req.user!.role || 'user';

    if (isNaN(commentId)) {
      return res.status(400).json({ message: '评论ID无效' });
    }

    await deleteComment(commentId, userId, userRole);
    res.json({ message: '删除成功' });
  } catch (error: any) {
    console.error('删除评论失败:', error);
    res.status(400).json({ message: error.message || '删除评论失败' });
  }
};

/**
 * 点赞/取消点赞评论
 */
export const toggleCommentLikeHandler = async (req: AuthRequest, res: Response) => {
  try {
    const commentId = Number(req.params.commentId);
    const userId = req.user!.userId;

    if (isNaN(commentId)) {
      return res.status(400).json({ message: '评论ID无效' });
    }

    const result = await toggleCommentLike(userId, commentId);
    res.json(result);
  } catch (error: any) {
    console.error('点赞评论失败:', error);
    res.status(400).json({ message: error.message || '点赞评论失败' });
  }
};

/**
 * 文字审查接口
 */
export const checkContentHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: '内容不能为空' });
    }

    const { contentModerationService } = await import('../services/comment.service');
    const result = contentModerationService.checkContent(content);

    res.json({
      valid: result.valid,
      violations: result.violations,
      message: result.valid
        ? '内容审核通过'
        : `内容包含违规词汇：${result.violations.join('、')}`,
    });
  } catch (error: any) {
    console.error('内容审查失败:', error);
    res.status(500).json({ message: '内容审查失败' });
  }
};
