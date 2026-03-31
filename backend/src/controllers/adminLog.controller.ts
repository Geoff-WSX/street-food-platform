import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { successResponse, errorResponse } from '../utils/response';

const prisma = new PrismaClient();

// 操作日志类型定义
export type AdminAction =
  | 'UPDATE_ROLE'          // 更新用户角色
  | 'TOGGLE_STATUS'        // 启用/禁用用户
  | 'RESET_PASSWORD'       // 重置密码
  | 'DELETE_USER'          // 删除用户
  | 'UPDATE_REPORT'        // 处理举报
  | 'DELETE_POST'          // 删除动态
  | 'MANAGE_COMMENT'       // 管理评论
  | 'UPDATE_SYSTEM'        // 系统设置
  | 'LOGIN'                // 登录
  | 'LOGOUT';              // 登出

export type TargetType = 'USER' | 'POST' | 'REPORT' | 'COMMENT' | 'SYSTEM' | 'SESSION';

// 创建操作日志
export const createAdminLog = async (params: {
  adminId: number;
  action: AdminAction;
  targetType: TargetType;
  targetId?: number;
  targetName?: string;
  description: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}) => {
  try {
    const log = await prisma.adminLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        targetName: params.targetName,
        description: params.description,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
    return log;
  } catch (error) {
    console.error('创建操作日志失败:', error);
    return null;
  }
};

// 获取操作日志列表
export const getAdminLogs = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      adminId,
      action,
      targetType,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    if (adminId) {
      where.adminId = parseInt(adminId as string);
    }

    if (action) {
      where.action = action as string;
    }

    if (targetType) {
      where.targetType = targetType as string;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSizeNum,
      }),
      prisma.adminLog.count({ where }),
    ]);

    // 格式化日志数据
    const formattedLogs = logs.map((log) => ({
      ...log,
      oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
      newValue: log.newValue ? JSON.parse(log.newValue) : null,
    }));

    return successResponse(res, {
      data: formattedLogs,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    });
  } catch (error: any) {
    console.error('获取操作日志失败:', error);
    return errorResponse(res, '获取操作日志失败', 'FETCH_LOGS_FAILED');
  }
};

// 获取单个操作日志详情
export const getAdminLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await prisma.adminLog.findUnique({
      where: { id: parseInt(id) },
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    if (!log) {
      return errorResponse(res, '日志不存在', 'LOG_NOT_FOUND');
    }

    return successResponse(res, {
      ...log,
      oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
      newValue: log.newValue ? JSON.parse(log.newValue) : null,
    });
  } catch (error: any) {
    console.error('获取操作日志详情失败:', error);
    return errorResponse(res, '获取操作日志详情失败', 'FETCH_LOG_FAILED');
  }
};

// 获取操作统计
export const getAdminLogStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    // 按操作类型统计
    const actionStats = await prisma.adminLog.groupBy({
      by: ['action'],
      where,
      _count: {
        action: true,
      },
    });

    // 按管理员统计
    const adminStats = await prisma.adminLog.groupBy({
      by: ['adminId'],
      where,
      _count: {
        adminId: true,
      },
    });

    // 获取管理员详细信息
    const adminIds = adminStats.map((s) => s.adminId);
    const admins = await prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: {
        id: true,
        username: true,
        avatar: true,
        role: true,
      },
    });

    const adminStatsWithInfo = adminStats.map((s) => ({
      adminId: s.adminId,
      count: s._count.adminId,
      admin: admins.find((a) => a.id === s.adminId),
    }));

    // 最近的日志数量
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recentLogs = await prisma.adminLog.count({
      where: {
        ...where,
        createdAt: {
          ...where.createdAt,
          gte: today,
        },
      },
    });

    return successResponse(res, {
      actionStats: actionStats.map((s) => ({
        action: s.action,
        count: s._count.action,
      })),
      adminStats: adminStatsWithInfo.sort((a, b) => b.count - a.count),
      todayCount: recentLogs,
    });
  } catch (error: any) {
    console.error('获取操作统计失败:', error);
    return errorResponse(res, '获取操作统计失败', 'FETCH_STATS_FAILED');
  }
};

// 获取操作类型列表
export const getActionTypes = async (_req: Request, res: Response) => {
  const actionTypes = [
    { value: 'UPDATE_ROLE', label: '更新角色', targetType: 'USER' },
    { value: 'TOGGLE_STATUS', label: '启用/禁用', targetType: 'USER' },
    { value: 'RESET_PASSWORD', label: '重置密码', targetType: 'USER' },
    { value: 'DELETE_USER', label: '删除用户', targetType: 'USER' },
    { value: 'UPDATE_REPORT', label: '处理举报', targetType: 'REPORT' },
    { value: 'DELETE_POST', label: '删除动态', targetType: 'POST' },
    { value: 'MANAGE_COMMENT', label: '管理评论', targetType: 'COMMENT' },
    { value: 'UPDATE_SYSTEM', label: '系统设置', targetType: 'SYSTEM' },
    { value: 'LOGIN', label: '登录', targetType: 'SESSION' },
    { value: 'LOGOUT', label: '登出', targetType: 'SESSION' },
  ];

  return successResponse(res, actionTypes);
};