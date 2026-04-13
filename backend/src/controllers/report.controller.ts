import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/db/prisma';
import { successResponse, errorResponse } from '../utils/response';

/**
 * 举报类型枚举
 */
export const REPORT_TYPES = [
  'spam',          // 垃圾信息
  'harassment',    // 骚扰
  'inappropriate', // 不当内容
  'fake',          // 虚假信息
  'scam',          // 诈骗
  'other',         // 其他
];

/**
 * 举报状态枚举
 */
export const REPORT_STATUS = {
  PENDING: 'pending',     // 待审核员处理
  REVIEWING: 'reviewing', // 待管理员审批（审核员已处理）
  RESOLVED: 'resolved',   // 已成立（管理员批准）
  REJECTED: 'rejected',   // 已驳回（管理员驳回）
};

/**
 * 创建举报
 */
export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    const { reportedId, type, description, images, chatRecords } = req.body;

    // 验证举报类型
    if (!REPORT_TYPES.includes(type)) {
      return errorResponse(res, '无效的举报类型', 'INVALID_TYPE');
    }

    // 不能举报自己
    if (reportedId === req.user!.userId) {
      return errorResponse(res, '不能举报自己', 'CANNOT_REPORT_SELF');
    }

    // 检查被举报用户是否存在
    const reportedUser = await prisma.user.findUnique({
      where: { id: reportedId },
    });

    if (!reportedUser) {
      return errorResponse(res, '被举报用户不存在', 'USER_NOT_FOUND');
    }

    // 检查是否已有待处理的举报
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: req.user!.userId,
        reportedId,
        status: REPORT_STATUS.PENDING,
      },
    });

    if (existingReport) {
      return errorResponse(res, '您已有针对该用户的待处理举报', 'REPORT_EXISTS');
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.user!.userId,
        reportedId,
        type,
        description: description || null,
        images: images && images.length > 0 ? JSON.stringify(images) : null,
        chatRecords: chatRecords && chatRecords.length > 0 ? JSON.stringify(chatRecords) : null,
        status: REPORT_STATUS.PENDING,
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            avatar: true,
            avatarData: true,
          },
        },
        reported: {
          select: {
            id: true,
            username: true,
            avatar: true,
            avatarData: true,
          },
        },
      },
    });

    return successResponse(res, report, '举报已提交，感谢您的反馈');
  } catch (error: any) {
    return errorResponse(res, error.message, 'CREATE_FAILED', 500);
  }
};

/**
 * 获取举报列表（管理员）
 */
export const getReports = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;

    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
              avatarData: true,
            },
          },
          reported: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
              avatarData: true,
              role: true,
              isActive: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              username: true,
            },
          },
          admin: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    // 解析 JSON 字段
    const reportsWithParsedData = reports.map((report) => ({
      ...report,
      images: report.images ? JSON.parse(report.images) : [],
      chatRecords: report.chatRecords ? JSON.parse(report.chatRecords) : [],
    }));

    return successResponse(res, {
      data: reportsWithParsedData,
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
 * 获取我的举报列表
 */
export const getMyReports = async (req: AuthRequest, res: Response) => {
  try {
    const reports = await prisma.report.findMany({
      where: {
        reporterId: req.user!.userId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        reported: {
          select: {
            id: true,
            username: true,
            avatar: true,
            avatarData: true,
          },
        },
      },
    });

    const reportsWithParsedData = reports.map((report) => ({
      ...report,
      images: report.images ? JSON.parse(report.images) : [],
      chatRecords: report.chatRecords ? JSON.parse(report.chatRecords) : [],
    }));

    return successResponse(res, reportsWithParsedData);
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};

/**
 * 审核员处理举报（第一级审核）
 */
export const reviewReport = async (req: AuthRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      return errorResponse(res, '无效的举报ID', 'INVALID_PARAM');
    }

    const { reviewerNote, recommendation } = req.body;
    // recommendation: 'approve' (建议成立) 或 'reject' (建议驳回)

    if (!recommendation || !['approve', 'reject'].includes(recommendation)) {
      return errorResponse(res, '无效的审核建议', 'INVALID_RECOMMENDATION');
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return errorResponse(res, '举报不存在', 'REPORT_NOT_FOUND');
    }

    if (report.status !== REPORT_STATUS.PENDING) {
      return errorResponse(res, '该举报已被审核或处理', 'ALREADY_HANDLED');
    }

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: REPORT_STATUS.REVIEWING,
        reviewerNote: reviewerNote || null,
        reviewerId: req.user!.userId,
        reviewedAt: new Date(),
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
          },
        },
        reported: {
          select: {
            id: true,
            username: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return successResponse(res, {
      ...updatedReport,
      recommendation,
    }, '审核完成，已提交给管理员审批');
  } catch (error: any) {
    return errorResponse(res, error.message, 'UPDATE_FAILED', 500);
  }
};

/**
 * 管理员最终审批举报（第二级审核）
 */
export const handleReport = async (req: AuthRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      return errorResponse(res, '无效的举报ID', 'INVALID_PARAM');
    }

    const { status, adminNote } = req.body;

    if (!['resolved', 'rejected'].includes(status)) {
      return errorResponse(res, '无效的状态', 'INVALID_STATUS');
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return errorResponse(res, '举报不存在', 'REPORT_NOT_FOUND');
    }

    // 管理员只能审批处于 reviewing 状态的举报
    if (report.status !== REPORT_STATUS.REVIEWING && report.status !== REPORT_STATUS.PENDING) {
      return errorResponse(res, '该举报已被处理', 'ALREADY_HANDLED');
    }

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        adminNote: adminNote || null,
        adminId: req.user!.userId,
        adminAt: new Date(),
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
          },
        },
        reported: {
          select: {
            id: true,
            username: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
          },
        },
        admin: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return successResponse(res, updatedReport, status === 'resolved' ? '举报已成立' : '举报已驳回');
  } catch (error: any) {
    return errorResponse(res, error.message, 'UPDATE_FAILED', 500);
  }
};

/**
 * 获取举报详情（管理员）
 */
export const getReportDetail = async (req: AuthRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      return errorResponse(res, '无效的举报ID', 'INVALID_PARAM');
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            avatarData: true,
            bio: true,
            createdAt: true,
          },
        },
        reported: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            avatarData: true,
            bio: true,
            role: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                posts: true,
                followers: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
          },
        },
        admin: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!report) {
      return errorResponse(res, '举报不存在', 'REPORT_NOT_FOUND');
    }

    const reportWithParsedData = {
      ...report,
      images: report.images ? JSON.parse(report.images) : [],
      chatRecords: report.chatRecords ? JSON.parse(report.chatRecords) : [],
    };

    return successResponse(res, reportWithParsedData);
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};

/**
 * 获取举报统计数据（管理员）
 */
export const getReportStats = async (req: AuthRequest, res: Response) => {
  try {
    const [totalReports, pendingReports, resolvedReports, rejectedReports] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { status: 'pending' } }),
      prisma.report.count({ where: { status: 'resolved' } }),
      prisma.report.count({ where: { status: 'rejected' } }),
    ]);

    // 按类型统计
    const reportsByType = await prisma.report.groupBy({
      by: ['type'],
      _count: {
        type: true,
      },
    });

    const typeStats = reportsByType.map((item) => ({
      type: item.type,
      count: item._count.type,
    }));

    return successResponse(res, {
      totalReports,
      pendingReports,
      resolvedReports,
      rejectedReports,
      typeStats,
    });
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};
