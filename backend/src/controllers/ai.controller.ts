import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import OpenAI from 'openai';
import { execSync, exec } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

// 初始化 OpenAI 客户端（支持代理和自定义 baseURL）
function createOpenAIClient() {
  const openaiConfig: any = {
    apiKey: process.env.OPENAI_API_KEY || '',
    timeout: 60000, // 60秒超时
    maxRetries: 1, // 最多重试1次
  };

  // 如果配置了自定义的 API 端点（比如使用中转服务）
  if (process.env.OPENAI_BASE_URL && process.env.OPENAI_BASE_URL !== 'https://api.openai.com/v1') {
    openaiConfig.baseURL = process.env.OPENAI_BASE_URL;
    console.log('Using custom baseURL:', process.env.OPENAI_BASE_URL);
  }

  return new OpenAI(openaiConfig);
}

const openai = createOpenAIClient();

// 定义可用的工具函数
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'query_reports',
      description: '查询所有举报信息，包括状态、数量等统计数据',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: '筛选举报状态：pending(待审核)、reviewing(审核中)、resolved(已成立)、rejected(已驳回)',
            enum: ['pending', 'reviewing', 'resolved', 'rejected', 'all'],
          },
          limit: {
            type: 'number',
            description: '返回的举报数量限制，默认20',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_report_status',
      description: '更新举报状态。只能更新状态为 pending 或 reviewing 的举报。resolved 表示举报成立（通过），rejected 表示举报不成立（驳回）',
      parameters: {
        type: 'object',
        properties: {
          reportId: {
            type: 'number',
            description: '举报ID',
          },
          status: {
            type: 'string',
            description: '新状态：resolved(成立/通过)、rejected(驳回/拒绝)、reviewing(审核中)',
            enum: ['resolved', 'rejected', 'reviewing'],
          },
          note: {
            type: 'string',
            description: '审核备注（可选）',
          },
        },
        required: ['reportId', 'status'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_users',
      description: '查询用户信息，包括统计数据',
      parameters: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            description: '筛选用户角色：user(普通用户)、reviewer(审核员)、admin(管理员)、super_admin(超级管理员)',
            enum: ['user', 'reviewer', 'admin', 'super_admin', 'all'],
          },
          limit: {
            type: 'number',
            description: '返回的用户数量限制，默认20',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_posts',
      description: '查询动态信息，包括内容、点赞数等',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '返回的动态数量限制，默认20',
          },
          sortBy: {
            type: 'string',
            description: '排序方式：likes(按点赞)、favorites(按收藏)、recent(最新)',
            enum: ['likes', 'favorites', 'recent'],
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'execute_command',
      description: '执行shell命令，用于排查问题、检查文件等。注意：不能执行数据库操作命令',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: '要执行的命令',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: '读取项目文件内容，用于分析代码',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: '文件路径，相对于项目根目录',
          },
        },
        required: ['filePath'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_user_role',
      description: '更新用户角色（仅超级管理员可用）。可以提升或降级用户权限',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'number',
            description: '用户ID',
          },
          role: {
            type: 'string',
            description: '新角色：user(普通用户)、reviewer(审核员)、admin(管理员)',
            enum: ['user', 'reviewer', 'admin'],
          },
        },
        required: ['userId', 'role'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_user_status',
      description: '更新用户状态（仅管理员可用）。可以启用或禁用用户账号',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'number',
            description: '用户ID',
          },
          isActive: {
            type: 'boolean',
            description: '是否启用账号：true 启用，false 禁用',
          },
        },
        required: ['userId', 'isActive'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_posts',
      description: '搜索美食动态，支持关键词、地点、美食类型筛选。用于美食推荐场景',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: '搜索关键词，如美食名称、食材等',
          },
          location: {
            type: 'string',
            description: '地点筛选，如城市名、区名',
          },
          limit: {
            type: 'number',
            description: '返回数量限制，默认10',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_comments',
      description: '查询评论信息，可以按动态ID或用户ID筛选',
      parameters: {
        type: 'object',
        properties: {
          postId: {
            type: 'number',
            description: '动态ID，查询该动态的评论',
          },
          userId: {
            type: 'number',
            description: '用户ID，查询该用户的评论',
          },
          limit: {
            type: 'number',
            description: '返回数量限制，默认20',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_dashboard_stats',
      description: '获取平台仪表盘统计数据，包括用户数、动态数、评论数、点赞数等',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_system_info',
      description: '获取系统运行状态信息，包括CPU、内存、运行时间等（仅管理员可用）',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

// 工具函数实现
async function queryReports(params: { status?: string; limit?: number } = {}) {
  const { status = 'all', limit = 20 } = params;

  const where: any = {};
  if (status !== 'all') {
    where.status = status;
  }

  const reports = await prisma.report.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: {
        select: { id: true, username: true },
      },
      reported: {
        select: { id: true, username: true },
      },
    },
  });

  // 统计数据
  const stats = {
    total: await prisma.report.count(),
    pending: await prisma.report.count({ where: { status: 'pending' } }),
    reviewing: await prisma.report.count({ where: { status: 'reviewing' } }),
    resolved: await prisma.report.count({ where: { status: 'resolved' } }),
    rejected: await prisma.report.count({ where: { status: 'rejected' } }),
  };

  return {
    summary: stats,
    reports: reports.map(r => ({
      id: r.id,
      type: r.type,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt,
      reporter: r.reporter?.username,
      reportedUser: r.reported?.username,
      hasImages: !!r.images,
      hasChatRecords: !!r.chatRecords,
    })),
  };
}

async function updateReportStatus(params: { reportId: number; status: string; note?: string }) {
  const { reportId, status, note } = params;

  // 检查举报是否存在
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reporter: { select: { username: true } },
      reported: { select: { username: true } },
    },
  });

  if (!report) {
    return {
      error: `举报 ID ${reportId} 不存在`,
    };
  }

  // 检查当前状态是否允许更新
  if (report.status === 'resolved' || report.status === 'rejected') {
    return {
      error: `举报 ID ${reportId} 的状态已经是 ${report.status}，无法再次修改`,
      currentStatus: report.status,
    };
  }

  // 更新举报状态
  const updateData: any = {
    status,
  };

  // 根据状态设置相应字段
  if (status === 'reviewing') {
    updateData.reviewerId = null; // AI 没有用户 ID
    updateData.reviewedAt = new Date();
    if (note) updateData.reviewerNote = note;
  } else if (status === 'resolved' || status === 'rejected') {
    updateData.adminId = null; // AI 没有用户 ID
    updateData.adminAt = new Date();
    if (note) updateData.adminNote = note;
  }

  const updatedReport = await prisma.report.update({
    where: { id: reportId },
    data: updateData,
  });

  return {
    success: true,
    message: `举报 ID ${reportId} 已更新为 ${status} 状态`,
    report: {
      id: updatedReport.id,
      status: updatedReport.status,
      type: updatedReport.type,
      reporter: report.reporter?.username,
      reportedUser: report.reported?.username,
    },
  };
}

async function queryUsers(params: { role?: string; limit?: number } = {}) {
  const { role = 'all', limit = 20 } = params;

  const where: any = {};
  if (role !== 'all') {
    where.role = role;
  }

  const users = await prisma.user.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      role: true,
      email: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          comments: true,
        },
      },
    },
  });

  // 统计数据
  const stats = {
    total: await prisma.user.count(),
    users: await prisma.user.count({ where: { role: 'user' } }),
    reviewers: await prisma.user.count({ where: { role: 'reviewer' } }),
    admins: await prisma.user.count({ where: { role: 'admin' } }),
  };

  return {
    summary: stats,
    users: users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      email: u.email,
      postCount: u._count.posts,
      commentCount: u._count.comments,
      createdAt: u.createdAt,
    })),
  };
}

async function queryPosts(params: { limit?: number; sortBy?: string } = {}) {
  const { limit = 20, sortBy = 'likes' } = params;

  const orderBy: any = {};
  if (sortBy === 'likes') {
    orderBy.likeCount = 'desc';
  } else if (sortBy === 'favorites') {
    orderBy.favoriteCount = 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }

  const posts = await prisma.post.findMany({
    take: limit,
    orderBy,
    select: {
      id: true,
      content: true,
      address: true,
      likeCount: true,
      favoriteCount: true,
      createdAt: true,
      user: {
        select: { username: true },
      },
    },
  });

  return {
    posts: posts.map(p => ({
      id: p.id,
      content: p.content.substring(0, 100),
      address: p.address,
      likeCount: p.likeCount || 0,
      favoriteCount: p.favoriteCount || 0,
      username: p.user.username,
      createdAt: p.createdAt,
    })),
  };
}

async function executeCommand(params: { command: string }) {
  const { command } = params;

  // 安全检查：只允许只读命令
  const dangerousCommands = ['rm ', 'delete ', 'del ', 'format', 'mkfs', 'dd ', 'shutdown', 'reboot'];
  const isDangerous = dangerousCommands.some(dc => command.toLowerCase().includes(dc));

  if (isDangerous) {
    return {
      error: '该命令存在安全风险，已被阻止',
      command,
    };
  }

  try {
    const result = execSync(command, { encoding: 'utf-8', maxBuffer: 1024 * 1024 });
    return {
      success: true,
      output: result.substring(0, 2000), // 限制输出长度
      command,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      command,
    };
  }
}

async function readFile(params: { filePath: string }) {
  const { filePath } = params;

  // 获取项目根目录
  const projectRoot = process.cwd();
  const fullPath = join(projectRoot, filePath);

  // 检查路径是否在项目内（防止路径遍历攻击）
  const normalizedPath = require('path').normalize(fullPath);
  if (!normalizedPath.startsWith(projectRoot)) {
    return {
      error: '访问被拒绝：路径超出项目范围',
    };
  }

  if (!existsSync(normalizedPath)) {
    return {
      error: `文件不存在: ${filePath}`,
    };
  }

  try {
    const content = readFileSync(normalizedPath, 'utf-8');
    return {
      success: true,
      filePath,
      content: content.substring(0, 5000), // 限制文件内容长度
      size: content.length,
    };
  } catch (error: any) {
    return {
      error: error.message,
      filePath,
    };
  }
}

// 用户管理函数（需要权限）
async function updateUserRole(params: { userId: number; role: string }, requesterRole?: string) {
  const { userId, role } = params;

  // 权限检查：只有超级管理员可以修改角色
  if (requesterRole !== 'super_admin') {
    return {
      error: '权限不足：只有超级管理员可以修改用户角色',
    };
  }

  // 检查用户是否存在
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true },
  });

  if (!user) {
    return {
      error: `用户 ID ${userId} 不存在`,
    };
  }

  // 不能修改超级管理员的角色（包括其他超级管理员）
  if (user.role === 'super_admin') {
    return {
      error: '不能修改超级管理员的角色',
    };
  }

  // 不能将用户设为超级管理员（只能通过数据库直接操作）
  if (role === 'super_admin') {
    return {
      error: '不能通过此接口将用户设为超级管理员',
    };
  }

  // 更新用户角色
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, username: true, role: true },
  });

  return {
    success: true,
    message: `用户 ${updatedUser.username} 的角色已更新为 ${role}`,
    user: updatedUser,
  };
}

async function updateUserStatus(params: { userId: number; isActive: boolean }, requesterRole?: string) {
  const { userId, isActive } = params;

  // 权限检查：管理员和超级管理员可以修改用户状态
  if (requesterRole !== 'admin' && requesterRole !== 'super_admin') {
    return {
      error: '权限不足：只有管理员可以修改用户状态',
    };
  }

  // 检查用户是否存在
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, isActive: true, role: true },
  });

  if (!user) {
    return {
      error: `用户 ID ${userId} 不存在`,
    };
  }

  // 不能修改超级管理员的状态（只有超级管理员自己可以修改）
  if (user.role === 'super_admin') {
    return {
      error: '不能修改超级管理员的账号状态',
    };
  }

  // 普通管理员不能修改其他管理员的账号状态
  if (requesterRole === 'admin' && user.role === 'admin') {
    return {
      error: '普通管理员不能修改其他管理员的账号状态',
    };
  }

  // 更新用户状态
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: { id: true, username: true, isActive: true },
  });

  return {
    success: true,
    message: `用户 ${updatedUser.username} 的账号已${isActive ? '启用' : '禁用'}`,
    user: updatedUser,
  };
}

// 搜索动态
async function searchPosts(params: { keyword?: string; location?: string; limit?: number }) {
  const { keyword, location, limit = 10 } = params;

  const where: any = {};

  // 关键词搜索（搜索内容）
  if (keyword) {
    where.OR = [
      { content: { contains: keyword } },
      { address: { contains: keyword } },
    ];
  }

  // 地点筛选
  if (location) {
    where.address = { contains: location };
  }

  const posts = await prisma.post.findMany({
    where,
    take: limit,
    orderBy: [
      { likeCount: 'desc' },
      { createdAt: 'desc' }
    ],
    select: {
      id: true,
      content: true,
      address: true,
      likeCount: true,
      favoriteCount: true,
      commentCount: true,
      createdAt: true,
      user: {
        select: { username: true, avatar: true },
      },
    },
  });

  return {
    keyword: keyword || '全部',
    location: location || '不限',
    total: posts.length,
    posts: posts.map(p => ({
      id: p.id,
      content: p.content,
      address: p.address,
      likeCount: p.likeCount || 0,
      favoriteCount: p.favoriteCount || 0,
      commentCount: p.commentCount || 0,
      username: p.user.username,
      userAvatar: p.user.avatar,
      createdAt: p.createdAt,
    })),
  };
}

// 查询评论
async function getComments(params: { postId?: number; userId?: number; limit?: number } = {}) {
  const { postId, userId, limit = 20 } = params;

  const where: any = {};
  if (postId) {
    where.postId = postId;
  }
  if (userId) {
    where.userId = userId;
  }

  const comments = await prisma.comment.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: {
        select: { username: true, avatar: true },
      },
      post: {
        select: { id: true, content: true },
      },
      parentId: true,
    },
  });

  return {
    total: comments.length,
    comments: comments.map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      username: c.user.username,
      userAvatar: c.user.avatar,
      postId: c.post.id,
      postPreview: c.post.content.substring(0, 50),
      isReply: !!c.parentId,
    })),
  };
}

// 获取仪表盘统计
async function getDashboardStats() {
  const [
    totalUsers,
    activeUsers,
    totalPosts,
    totalComments,
    totalLikes,
    totalFavorites,
    todayPosts,
    todayComments,
    pendingReports,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.post.count(),
    prisma.comment.count(),
    prisma.like.count(),
    prisma.favorite.count(),
    prisma.post.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.comment.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.report.count({ where: { status: 'pending' } }),
  ]);

  // 获取热门动态
  const topPosts = await prisma.post.findMany({
    take: 5,
    orderBy: { likeCount: 'desc' },
    select: {
      id: true,
      content: true,
      likeCount: true,
      favoriteCount: true,
    },
  });

  // 获取最新动态
  const latestPosts = await prisma.post.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      content: true,
      createdAt: true,
    },
  });

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
    },
    content: {
      totalPosts,
      totalComments,
      totalLikes,
      totalFavorites,
    },
    today: {
      posts: todayPosts,
      comments: todayComments,
    },
    reports: {
      pending: pendingReports,
    },
    topPosts,
    latestPosts,
  };
}

// 获取系统信息
async function getSystemInfo() {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  // 获取 Node.js 版本和平台信息
  const nodeVersion = process.version;
  const platform = os.platform();
  const arch = os.arch();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();

  // 获取负载
  const loadavg = os.loadavg();

  // 获取运行时间格式化
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const uptimeStr = `${days}天${hours}小时${minutes}分钟`;

  // 获取数据库连接状态
  let dbStatus = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'error';
  }

  return {
    node: {
      version: nodeVersion,
      platform: `${platform} (${arch})`,
    },
    uptime: uptimeStr,
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
      system: {
        total: Math.round(totalMemory / 1024 / 1024 / 1024) + ' GB',
        free: Math.round(freeMemory / 1024 / 1024 / 1024) + ' GB',
        usage: Math.round((1 - freeMemory / totalMemory) * 100) + '%',
      },
    },
    loadavg,
    database: {
      status: dbStatus,
    },
  };
}

// 工具函数映射
const toolFunctions: Record<string, (params: any, userRole?: string) => Promise<any>> = {
  query_reports: queryReports,
  update_report_status: updateReportStatus,
  query_users: queryUsers,
  query_posts: queryPosts,
  execute_command: executeCommand,
  read_file: readFile,
  update_user_role: updateUserRole,
  update_user_status: updateUserStatus,
  search_posts: searchPosts,
  get_comments: getComments,
  get_dashboard_stats: getDashboardStats,
  get_system_info: getSystemInfo,
};

/**
 * AI 对话接口 - 真正的智能体，支持函数调用
 */
export const chat = async (req: AuthRequest, res: Response) => {
  try {
    const { message, conversationHistory = [], systemPrompt, mode = 'foodie' } = req.body;

    console.log('=== AI Chat Request ===');
    console.log('User:', req.user?.userId);
    console.log('User Role:', req.user?.role);
    console.log('Mode:', mode);
    console.log('Message:', message);
    console.log('Has API Key:', !!process.env.OPENAI_API_KEY);

    if (!message || typeof message !== 'string') {
      return errorResponse(res, '请输入有效的消息', 'INVALID_MESSAGE');
    }

    // 管理模式权限检查
    if (mode === 'admin') {
      const userRole = req.user?.role;
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        return errorResponse(res, '权限不足：只有管理员才能使用管理模式', 'PERMISSION_DENIED', 403);
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API Key not configured');
      return errorResponse(res, '请配置 OPENAI_API_KEY 环境变量', 'MISSING_API_KEY', 500);
    }

    // 管理模式：使用函数调用执行实际操作
    if (mode === 'admin') {
      // 构建管理系统提示
      const adminSystemPrompt = systemPrompt || `你是小边管理系统，具有以下技能：
1. Bug 排查技能 (bug-detection) - 排查项目中的问题
2. Bug 审核技能 (bug-review) - 审核问题并给出方案
3. Bug 解决技能 (bug-solution) - 执行代码修复
4. Bug 验证技能 (bug-verification) - 验证修复结果
5. 审核员技能 (review-guide) - 审核举报内容
6. 证据分析技能 (evidence-analysis) - 分析证据材料
7. 违规判断技能 (violation-judgment) - 判断是否违规

你有能力直接访问和分析项目：
- 查询举报信息 (query_reports)
- 更新举报状态 (update_report_status)
- 查询用户信息 (query_users)
- 更新用户角色 (update_user_role) - 仅超级管理员
- 更新用户状态 (update_user_status) - 仅管理员
- 查询动态信息 (query_posts)
- 搜索美食动态 (search_posts) - 按关键词和地点搜索
- 查询评论信息 (get_comments) - 查看评论详情
- 获取仪表盘统计 (get_dashboard_stats) - 查看平台数据概览
- 获取系统信息 (get_system_info) - 查看系统运行状态
- 执行命令 (execute_command)
- 读取文件 (read_file)

当用户要求你"查看"、"列出"、"检查"、"统计"等操作时，你必须：
1. 使用相应的工具函数获取真实数据
2. 将获取的数据整理成清晰的格式返回给用户

当前用户权限：${req.user?.role || 'user'}
当前用户ID：${req.user?.userId || 'unknown'}

超级管理员额外权限：
- 可以修改管理员的角色
- 可以查看和修改所有用户数据

管理员权限：
- 可以查看所有用户数据
- 可以启用/禁用用户账号
- 可以处理举报
- 可以查看系统信息

请根据用户需求使用合适的工具，实际执行操作而不是只说要做。`;

      const messages: any[] = [
        { role: 'system', content: adminSystemPrompt },
      ];

      // 添加历史对话
      if (Array.isArray(conversationHistory)) {
        const recentHistory = conversationHistory.slice(-6);
        messages.push(...recentHistory);
      }

      // 添加当前消息
      messages.push({ role: 'user', content: message });

      try {
        // 第一步：调用 OpenAI，让 AI 决定是否需要使用工具
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          tools,
          temperature: 0.7,
          max_tokens: 2000,
        });

        const assistantMessage = response.choices[0].message;

        // 检查是否需要调用工具
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          console.log('AI requests tool calls:', assistantMessage.tool_calls.length);

          // 执行工具调用
          const toolResults: any[] = [];
          for (const toolCall of assistantMessage.tool_calls) {
            // 处理不同类型的 tool_call
            if (toolCall.type === 'function') {
              const fnCall = toolCall as any;
              const functionName = fnCall.function.name;
              const functionArgs = JSON.parse(fnCall.function.arguments);

              console.log(`Executing tool: ${functionName}`, functionArgs);

              if (toolFunctions[functionName]) {
                try {
                  // 传递用户角色给工具函数（用于权限检查）
                  const result = await toolFunctions[functionName](functionArgs, req.user?.role);
                  toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    content: JSON.stringify(result),
                  });
                  console.log(`Tool ${functionName} result:`, JSON.stringify(result).substring(0, 200));
                } catch (toolError: any) {
                  console.error(`Tool ${functionName} error:`, toolError.message);
                  toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    content: JSON.stringify({ error: toolError.message }),
                  });
                }
              }
            }
          }

          // 第二步：将工具结果发送回 AI，让它生成最终回复
          messages.push(assistantMessage);
          messages.push(...toolResults);

          const finalResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 2000,
          });

          const aiResponse = finalResponse.choices[0].message.content || '';

          return successResponse(res, {
            message: aiResponse,
            suggestedPosts: [],
          });
        }

        // 没有工具调用，直接返回 AI 回复
        const aiResponse = assistantMessage.content || '';

        return successResponse(res, {
          message: aiResponse,
          suggestedPosts: [],
        });
      } catch (openaiError: any) {
        console.error('OpenAI Error in admin mode:', openaiError.message);
        return errorResponse(res, openaiError.message || 'AI 服务错误', 'AI_ERROR', 500);
      }
    }

    // 美食模式：先搜索数据，再生成回复
    try {
      // 先获取热门动态数据
      const trendingPosts = await prisma.post.findMany({
        take: 20,
        orderBy: [
          { likeCount: 'desc' },
          { favoriteCount: 'desc' }
        ],
        select: {
          id: true,
          content: true,
          address: true,
          likeCount: true,
          favoriteCount: true,
          user: {
            select: { username: true },
          },
        },
      });

      const cities = [...new Set(trendingPosts.map(p => p.address).filter(Boolean))];

      // 美食模式的系统提示词
      const foodieSystemPrompt = `你是"小边"，街边美食平台的 AI 智能助手。你是一个热情的美食探索家，热爱发现城市的美味角落。

**当前平台热门美食：**
${trendingPosts.slice(0, 10).map((p, i) => `${i+1}. "${p.content.substring(0, 60)}" (${p.likeCount || 0}赞) 📍${p.address || '未知位置'}`).join('\n')}

**覆盖城市：** ${cities.slice(0, 8).join('、')}

**回复规范：**
1. 根据用户问题，结合上述数据给出回答
2. 回复控制在 100 字以内
3. 回复末尾用【推荐:ID1,ID2】格式列出推荐的动态ID
4. 如果没有相关推荐，用【推荐:】表示
5. 使用表情符号让对话更生动（🍜🔥✨📍👍）

请用中文回复，语气亲切简洁，像朋友聊天一样！`;

      const messages: any[] = [
        { role: 'system', content: foodieSystemPrompt },
      ];

      // 添加历史对话
      if (Array.isArray(conversationHistory)) {
        const recentHistory = conversationHistory.slice(-6);
        messages.push(...recentHistory);
      }

      // 添加当前消息
      messages.push({ role: 'user', content: message });

      console.log('Calling OpenAI in foodie mode...');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      console.log('OpenAI Response received');
      const aiResponse = completion.choices[0].message.content || '';

      // 提取推荐的动态ID
      const match = aiResponse.match(/【推荐:([^\]]*)】/);
      let suggestedPostIds: number[] = [];
      if (match && match[1]) {
        suggestedPostIds = match[1].split(',')
          .map(id => {
            const cleanId = id.replace(/^ID/i, '').trim();
            const numId = parseInt(cleanId);
            return isNaN(numId) ? null : numId;
          })
          .filter((id): id is number => id !== null);
      }

      const cleanResponse = aiResponse.replace(/【推荐:[^\]]*】/g, '').trim();

      return successResponse(res, {
        message: cleanResponse,
        suggestedPosts: suggestedPostIds,
      });
    } catch (openaiError: any) {
      console.error('OpenAI Error in foodie mode:', openaiError.message);
      return errorResponse(res, openaiError.message || 'AI 服务错误', 'AI_ERROR', 500);
    }
  } catch (error: any) {
    console.error('=== AI Chat Error ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    return errorResponse(
      res,
      error.message || 'AI 服务暂时不可用',
      'AI_ERROR',
      500
    );
  }
};
