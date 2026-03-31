import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import bcrypt from 'bcrypt';
import { createAdminLog } from './adminLog.controller';

/**
 * 获取所有用户列表（管理员）
 */
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const keyword = req.query.keyword as string || '';
    const role = req.query.role as string || '';

    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: any = {};
    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { email: { contains: keyword } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          bio: true,
          role: true,
          isActive: true,
          allowMessage: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              posts: true,
              likes: true,
              favorites: true,
              followers: true,
              following: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return successResponse(res, {
      data: users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};

/**
 * 更新用户角色（管理员）
 */
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }

    const { role } = req.body;
    if (!['user', 'reviewer', 'admin'].includes(role)) {
      return errorResponse(res, '无效的角色', 'INVALID_ROLE');
    }

    // 不能修改自己的角色
    if (userId === req.user!.userId) {
      return errorResponse(res, '不能修改自己的角色', 'CANNOT_MODIFY_SELF');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return errorResponse(res, '用户不存在', 'USER_NOT_FOUND');
    }

    // 不能修改超级管理员的角色
    if (user.role === 'super_admin') {
      return errorResponse(res, '不能修改超级管理员的角色', 'CANNOT_MODIFY_SUPER_ADMIN');
    }

    // 不能将用户设为超级管理员
    if (role === 'super_admin') {
      return errorResponse(res, '不能通过此接口将用户设为超级管理员', 'INVALID_ROLE');
    }

    // 普通管理员不能修改其他管理员的角色
    const requesterRole = req.user?.role;
    if (requesterRole === 'admin' && user.role === 'admin') {
      return errorResponse(res, '普通管理员不能修改其他管理员的角色', 'PERMISSION_DENIED');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    // 记录操作日志
    await createAdminLog({
      adminId: req.user!.userId,
      action: 'UPDATE_ROLE',
      targetType: 'USER',
      targetId: userId,
      targetName: user.username,
      description: `将用户「${user.username}」的角色从「${user.role}」修改为「${role}」`,
      oldValue: { role: user.role },
      newValue: { role },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, null, '角色已更新');
  } catch (error: any) {
    return errorResponse(res, error.message, 'UPDATE_FAILED');
  }
};

/**
 * 启用/禁用用户账号（管理员）
 */
export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }

    // 不能禁用自己的账号
    if (userId === req.user!.userId) {
      return errorResponse(res, '不能禁用自己的账号', 'CANNOT_DISABLE_SELF');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, isActive: true, role: true }
    });
    if (!user) {
      return errorResponse(res, '用户不存在', 'USER_NOT_FOUND');
    }

    // 不能修改超级管理员的状态
    if (user.role === 'super_admin') {
      return errorResponse(res, '不能修改超级管理员的账号状态', 'CANNOT_MODIFY_SUPER_ADMIN');
    }

    // 普通管理员不能修改其他管理员的状态
    const requesterRole = req.user?.role;
    if (requesterRole === 'admin' && user.role === 'admin') {
      return errorResponse(res, '普通管理员不能修改其他管理员的账号状态', 'PERMISSION_DENIED');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        username: true,
        isActive: true,
      },
    });

    // 记录操作日志
    await createAdminLog({
      adminId: req.user!.userId,
      action: 'TOGGLE_STATUS',
      targetType: 'USER',
      targetId: userId,
      targetName: user.username,
      description: `${updatedUser.isActive ? '启用' : '禁用'}了用户「${user.username}」`,
      oldValue: { isActive: user.isActive },
      newValue: { isActive: updatedUser.isActive },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, updatedUser, `账号已${updatedUser.isActive ? '启用' : '禁用'}`);
  } catch (error: any) {
    return errorResponse(res, error.message, 'UPDATE_FAILED');
  }
};

/**
 * 重置用户密码（管理员）
 */
export const resetUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return errorResponse(res, '密码至少6位', 'INVALID_PASSWORD');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true }
    });
    if (!user) {
      return errorResponse(res, '用户不存在', 'USER_NOT_FOUND');
    }

    // 不能重置超级管理员的密码
    if (user.role === 'super_admin') {
      return errorResponse(res, '不能重置超级管理员的密码', 'CANNOT_RESET_SUPER_ADMIN_PASSWORD');
    }

    // 普通管理员不能重置其他管理员的密码
    const requesterRole = req.user?.role;
    if (requesterRole === 'admin' && user.role === 'admin') {
      return errorResponse(res, '普通管理员不能重置其他管理员的密码', 'PERMISSION_DENIED');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // 记录操作日志
    await createAdminLog({
      adminId: req.user!.userId,
      action: 'RESET_PASSWORD',
      targetType: 'USER',
      targetId: userId,
      targetName: user.username,
      description: `重置了用户「${user.username}」的密码`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, null, '密码已重置');
  } catch (error: any) {
    return errorResponse(res, error.message, 'UPDATE_FAILED');
  }
};

/**
 * 删除用户（管理员）
 */
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }

    // 不能删除自己的账号
    if (userId === req.user!.userId) {
      return errorResponse(res, '不能删除自己的账号', 'CANNOT_DELETE_SELF');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true }
    });
    if (!user) {
      return errorResponse(res, '用户不存在', 'USER_NOT_FOUND');
    }

    // 不能删除超级管理员
    if (user.role === 'super_admin') {
      return errorResponse(res, '不能删除超级管理员账号', 'CANNOT_DELETE_SUPER_ADMIN');
    }

    // 普通管理员不能删除其他管理员
    const requesterRole = req.user?.role;
    if (requesterRole === 'admin' && user.role === 'admin') {
      return errorResponse(res, '普通管理员不能删除其他管理员', 'PERMISSION_DENIED');
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    // 记录操作日志
    await createAdminLog({
      adminId: req.user!.userId,
      action: 'DELETE_USER',
      targetType: 'USER',
      targetId: userId,
      targetName: user.username,
      description: `删除了用户「${user.username}」`,
      oldValue: { id: user.id, username: user.username, role: user.role },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, null, '用户已删除');
  } catch (error: any) {
    return errorResponse(res, error.message, 'DELETE_FAILED');
  }
};

/**
 * 获取系统统计信息（管理员）
 */
export const getSystemStats = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalPosts,
      totalLikes,
      totalFavorites,
      activeUsers,
      newUsersToday,
      adminCount,
      superAdminCount,
      reviewerCount,
      reportCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.like.count(),
      prisma.favorite.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.user.count({ where: { role: 'super_admin' } }),
      prisma.user.count({ where: { role: 'reviewer' } }),
      prisma.report.count({ where: { status: 'pending' } }),
    ]);

    return successResponse(res, {
      totalUsers,
      totalPosts,
      totalLikes,
      totalFavorites,
      activeUsers,
      newUsersToday,
      adminCount: adminCount + superAdminCount,
      superAdminCount,
      reviewerCount,
      reportCount,
    });
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};
