import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/db/prisma';
import { successResponse, errorResponse } from '../utils/response';
import OpenAI from 'openai';
import { exec } from 'child_process';
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

// 挂起操作存储（用于确认机制）
interface PendingOperation {
  id: string;
  functionName: string;
  functionArgs: any;
  description: string;
  createdAt: Date;
  requesterRole?: string;
}

const pendingOperations = new Map<string, PendingOperation>();
const OPERATION_EXPIRE_MS = 5 * 60 * 1000; // 5分钟过期

// 生成唯一操作ID
function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// 清理过期操作
function cleanupExpiredOperations() {
  const now = Date.now();
  for (const [id, op] of pendingOperations.entries()) {
    if (now - op.createdAt.getTime() > OPERATION_EXPIRE_MS) {
      pendingOperations.delete(id);
    }
  }
}

// 定期清理过期操作
setInterval(cleanupExpiredOperations, 60000);

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
      description: '搜索美食动态，支持关键词、地点、话题筛选。用于美食推荐场景',
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
          tag: {
            type: 'string',
            description: '话题筛选，如"火锅"、"烧烤"等',
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
      name: 'confirm_operation',
      description: '确认执行一个挂起的操作。当用户明确回复"确认"、"是"、"执行"后才调用此函数',
      parameters: {
        type: 'object',
        properties: {
          operationId: {
            type: 'string',
            description: '操作ID，从之前的回复中获取',
          },
        },
        required: ['operationId'],
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

async function updateReportStatus(params: { reportId: number; status: string; note?: string }, requesterRole?: string) {
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

  // 生成操作描述
  const statusLabels: Record<string, string> = {
    resolved: '成立（通过）',
    rejected: '驳回（拒绝）',
    reviewing: '审核中'
  };
  const description = `将举报 ID ${reportId}（${report.type}）的状态从"${report.status}"更新为"${statusLabels[status] || status}"${note ? `，备注：${note}` : ''}`;

  // 返回需要确认的状态
  return {
    needs_confirmation: true,
    operationDescription: description,
    operationDetails: {
      reportId,
      status,
      note,
      reporter: report.reporter?.username,
      reportedUser: report.reported?.username,
    },
  };
}

// 实际执行举报状态更新
async function executeReportStatusUpdate(params: { reportId: number; status: string; note?: string }) {
  const { reportId, status, note } = params;

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

async function executeCommand(params: { command: string }, requesterRole?: string) {
  const { command } = params;

  // 权限检查：只有管理员和超级管理员可以使用命令执行功能
  if (requesterRole !== 'admin' && requesterRole !== 'super_admin') {
    return {
      error: '权限不足：只有管理员可以使用命令执行功能',
    };
  }

  // 白名单机制：只允许特定的只读诊断命令
  const allowedCommands = [
    'echo',
    'pwd',
    'ls',
    'll',
    'dir',
    'whoami',
    'node --version',
    'node -v',
    'npm --version',
    'npm -v',
    'git --version',
    'git status',
    'git log',
    'ps',
    'df',
    'du',
    'free',
    'top',
    'netstat',
    'curl',
    'wget',
    'cat',
    'head',
    'tail',
    'grep',
    'find',
    'wc',
  ];

  // 提取命令（去除参数，只保留命令名）
  const commandParts = command.trim().split(/\s+/);
  const baseCommand = commandParts[0].toLowerCase();

  // 检查是否是允许的命令
  const isAllowed = allowedCommands.some(allowed => {
    if (allowed.includes(' ')) {
      // 对于带参数的命令（如 "node --version"），检查命令是否以允许的命令开头
      return command.toLowerCase().startsWith(allowed);
    }
    return baseCommand === allowed || baseCommand === commandParts[0];
  });

  if (!isAllowed) {
    return {
      error: '该命令不在允许列表中，只允许执行特定的只读诊断命令',
      allowedCommands: 'echo, pwd, ls, node --version, npm --version, git status, ps, df, du, free, netstat, curl, cat, head, tail, grep, find, wc',
    };
  }

  // 额外安全检查：禁止危险的命令组合
  const dangerousPatterns = [
    /\|.*rm/i,
    /\;.*rm/i,
    /\&&\s*rm/i,
    /\|\s*del/i,
    /;\s*del/i,
    /&\s*del/i,
    /format/i,
    /mkfs/i,
    /dd\s+/i,
    /shutdown/i,
    /reboot/i,
    /init/i,
    /systemctl/i,
    /service\s+.*stop/i,
    /kill\s+-9/i,
    /killall/i,
    /pkill/i,
    /;\s*wget/i,
    /;\s*curl.*>/i,
    /\|\s*nc/i,
    /\$\(/i,
    /`.*`/i,
    /\.\.\//i,  // 禁止路径遍历
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return {
        error: '检测到危险的命令模式，已被阻止',
        command,
      };
    }
  }

  try {
    // 使用 exec 并设置超时（5秒）
    const result = await new Promise<string>((resolve, reject) => {
      const childProcess = exec(command, {
        encoding: 'utf-8',
        maxBuffer: 512 * 1024, // 512KB 输出限制
        timeout: 5000, // 5秒超时
      }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });

    return {
      success: true,
      output: result.substring(0, 2000), // 限制输出长度
      command,
    };
  } catch (error: any) {
    // 区分超时错误和其他错误
    if (error.message && error.message.includes('timeout')) {
      return {
        success: false,
        error: '命令执行超时（超过5秒），可能被阻止或运行时间过长',
        command,
      };
    }
    return {
      success: false,
      error: error.message || '命令执行失败',
      command,
    };
  }
}

async function readFile(params: { filePath: string }, requesterRole?: string) {
  const { filePath } = params;

  // 权限检查：只有管理员和超级管理员可以读取文件
  if (requesterRole !== 'admin' && requesterRole !== 'super_admin') {
    return {
      error: '权限不足：只有管理员可以读取文件',
    };
  }

  // 获取项目根目录
  const projectRoot = process.cwd();

  // 基础文件名检查（防止空白路径）
  const fileName = require('path').basename(filePath);
  if (!fileName || fileName === '.' || fileName === '..') {
    return {
      error: '无效的文件路径',
    };
  }

  // 构建绝对路径并规范化
  const fullPath = require('path').resolve(projectRoot, filePath);
  const normalizedPath = require('path').normalize(fullPath);

  // 双重检查：确保最终路径在项目目录内
  // 使用更安全的检查方式：解析符号链接并比较
  let realPath: string;
  try {
    realPath = require('fs').realpathSync(normalizedPath);
  } catch {
    // 如果 realpathSync 失败（文件不存在或其他），使用 normalizedPath
    realPath = normalizedPath;
  }

  const realProjectRoot = require('fs').realpathSync(projectRoot);

  // 确保文件在项目目录内（支持符号链接项目目录）
  if (!realPath.startsWith(realProjectRoot + require('path').sep) && realPath !== realProjectRoot) {
    return {
      error: '访问被拒绝：路径超出项目范围',
      attemptedPath: filePath,
    };
  }

  // 额外检查：确保路径不包含危险的遍历模式
  if (filePath.includes('..') || filePath.includes('~')) {
    return {
      error: '访问被拒绝：不允许路径遍历',
    };
  }

  if (!existsSync(realPath)) {
    return {
      error: `文件不存在: ${filePath}`,
    };
  }

  try {
    // 检查是否是文件（不是目录）
    const stats = require('fs').statSync(realPath);
    if (!stats.isFile()) {
      return {
        error: '只能读取文件，不能读取目录',
        path: filePath,
      };
    }

    const content = readFileSync(realPath, 'utf-8');
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

  // 生成操作描述
  const roleLabels: Record<string, string> = {
    user: '普通用户',
    reviewer: '审核员',
    admin: '管理员'
  };
  const description = `将用户 ${user.username}（ID: ${userId}）的角色从"${roleLabels[user.role] || user.role}"修改为"${roleLabels[role] || role}"`;

  // 返回需要确认的状态
  return {
    needs_confirmation: true,
    operationDescription: description,
    operationDetails: {
      userId,
      role,
      currentRole: user.role,
      username: user.username,
    },
  };
}

// 实际执行用户角色更新
async function executeUserRoleUpdate(params: { userId: number; role: string }) {
  const { userId, role } = params;

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

  // 生成操作描述
  const description = `将用户 ${user.username}（ID: ${userId}）的账号${isActive ? '启用' : '禁用'}`;

  // 返回需要确认的状态
  return {
    needs_confirmation: true,
    operationDescription: description,
    operationDetails: {
      userId,
      isActive,
      username: user.username,
      currentStatus: user.isActive,
    },
  };
}

// 实际执行用户状态更新
async function executeUserStatusUpdate(params: { userId: number; isActive: boolean }) {
  const { userId, isActive } = params;

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
async function searchPosts(params: { keyword?: string; location?: string; tag?: string; limit?: number }) {
  const { keyword, location, tag, limit = 10 } = params;

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

  // 话题筛选
  let tagId: number | null = null;
  if (tag) {
    const normalizedTag = tag.trim().toLowerCase().replace(/#/g, '');
    const tagRecord = await prisma.tag.findUnique({
      where: { name: normalizedTag },
    });
    if (tagRecord) {
      tagId = tagRecord.id;
    }
  }

  let postIds: number[] = [];
  if (tagId !== null) {
    const postTags = await prisma.postTag.findMany({
      where: { tagId },
      select: { postId: true },
    });
    postIds = postTags.map(pt => pt.postId);
    if (postIds.length === 0) {
      return {
        keyword: keyword || '全部',
        location: location || '不限',
        tag: tag || '不限',
        total: 0,
        posts: [],
      };
    }
    where.id = { in: postIds };
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
        select: { username: true, avatar: true, avatarData: true },
      },
    },
  });

  return {
    keyword: keyword || '全部',
    location: location || '不限',
    tag: tag || '不限',
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
        select: { username: true, avatar: true, avatarData: true },
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
  confirm_operation: confirmOperation,
};

// 确认操作函数
async function confirmOperation(params: { operationId: string }, requesterRole?: string) {
  const { operationId } = params;

  // 清理过期操作
  cleanupExpiredOperations();

  const operation = pendingOperations.get(operationId);
  if (!operation) {
    return {
      success: false,
      error: `操作已过期或不存在，请重新执行操作`,
    };
  }

  // 删除挂起操作（防止重复执行）
  pendingOperations.delete(operationId);

  // 根据操作类型执行实际操作
  switch (operation.functionName) {
    case 'update_report_status':
      return await executeReportStatusUpdate(operation.functionArgs);
    case 'update_user_role':
      return await executeUserRoleUpdate(operation.functionArgs);
    case 'update_user_status':
      return await executeUserStatusUpdate(operation.functionArgs);
    default:
      return {
        success: false,
        error: `未知的操作类型: ${operation.functionName}`,
      };
  }
}

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
- 更新举报状态 (update_report_status) - 需要用户确认
- 查询用户信息 (query_users)
- 更新用户角色 (update_user_role) - 需要用户确认，仅超级管理员
- 更新用户状态 (update_user_status) - 需要用户确认，仅管理员
- 查询动态信息 (query_posts)
- 搜索美食动态 (search_posts) - 按关键词和地点搜索
- 查询评论信息 (get_comments) - 查看评论详情
- 获取仪表盘统计 (get_dashboard_stats) - 查看平台数据概览
- 获取系统信息 (get_system_info) - 查看系统运行状态
- 执行命令 (execute_command)
- 读取文件 (read_file)
- 确认操作 (confirm_operation) - 用户确认后执行挂起的操作

【重要】操作确认机制：
当用户要求执行管理操作（如更新举报状态、修改用户角色、修改用户状态）时：
1. 不要直接执行操作，而是调用相应的工具函数
2. 工具函数会返回 needs_confirmation: true 并附带操作描述
3. 你必须向用户展示操作计划："我计划执行以下操作：..."
4. 询问用户确认："请问确认执行吗？"
5. 只有当用户明确回复"确认"、"是"、"执行"时才调用 confirm_operation
6. 如果用户回复"取消"、"否"、"不执行"，则回复"好的，操作已取消。"

当用户说"确认"、"是"、"执行"等确认词时：
1. 调用 confirm_operation 工具，传入之前返回的 operationId
2. 根据返回结果告知用户操作是否成功

当用户说"取消"、"否"、"不执行"等取消词时：
1. 回复"好的，操作已取消。"

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
          let hasPendingConfirmation = false;
          let pendingConfirmationResult: any = null;

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

                  // 检查是否需要确认
                  if (result.needs_confirmation) {
                    // 生成操作ID并存储挂起操作
                    const operationId = generateOperationId();
                    const pendingOp: PendingOperation = {
                      id: operationId,
                      functionName,
                      functionArgs,
                      description: result.operationDescription,
                      createdAt: new Date(),
                      requesterRole: req.user?.role,
                    };
                    pendingOperations.set(operationId, pendingOp);

                    // 标记有挂起确认
                    hasPendingConfirmation = true;
                    pendingConfirmationResult = {
                      tool_call_id: toolCall.id,
                      role: 'tool',
                      content: JSON.stringify({
                        needs_confirmation: true,
                        operationId,
                        operationDescription: result.operationDescription,
                        message: `我计划执行以下操作：${result.operationDescription}。请问确认执行吗？`,
                      }),
                    };
                    console.log(`Tool ${functionName} requires confirmation, operation ID: ${operationId}`);
                  } else {
                    // 普通工具调用，直接返回结果
                    toolResults.push({
                      tool_call_id: toolCall.id,
                      role: 'tool',
                      content: JSON.stringify(result),
                    });
                  }
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

          // 如果有需要确认的操作，先返回确认请求，不执行后续的 finalResponse
          if (hasPendingConfirmation) {
            // 只保留确认相关的工具结果
            const confirmationToolResult = [pendingConfirmationResult];

            // 将确认请求发送给 AI，让它生成确认提示
            messages.push(assistantMessage);
            messages.push(...confirmationToolResult);

            const confirmResponse = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages,
              temperature: 0.7,
              max_tokens: 1000,
            });

            const aiConfirmMessage = confirmResponse.choices[0].message.content || '';

            return successResponse(res, {
              message: aiConfirmMessage,
              needsConfirmation: true,
              suggestedPosts: [],
            });
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

    // 美食模式：智能美食推荐
    try {
      // 从用户消息中提取地点关键词
      const cityKeywords = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '西安', '武汉', '南京', '苏州', '天津', '青岛', '大连', '厦门', '长沙', '郑州', '济南', '哈尔滨', '长春', '沈阳', '石家庄', '福州', '南昌', '合肥', '昆明', '贵阳', '南宁', '海口', '太原', '兰州', '乌鲁木齐', '呼和浩特', '拉萨', '银川', '西宁'];
      let detectedCity: string | null = null;
      for (const city of cityKeywords) {
        if (message.includes(city)) {
          detectedCity = city;
          break;
        }
      }

      // 提取可能的美食关键词（从用户消息中）
      const foodKeywords: string[] = [];
      const commonFoods = ['火锅', '烧烤', '串串', '麻辣', '小龙虾', '烤肉', '炸鸡', '奶茶', '甜品', '面馆', '小吃', '快餐', '海鲜', '川菜', '粤菜', '湘菜', '鲁菜', '闽菜', '苏菜', '浙菜', '徽菜'];
      for (const food of commonFoods) {
        if (message.includes(food)) {
          foodKeywords.push(food);
        }
      }

      // 获取更多动态数据以提高搜索覆盖率（增加到200条）
      let allPosts = await prisma.post.findMany({
        take: 200,
        orderBy: [
          { likeCount: 'desc' },
          { favoriteCount: 'desc' },
          { commentCount: 'desc' }
        ],
        select: {
          id: true,
          content: true,
          images: true,
          address: true,
          likeCount: true,
          favoriteCount: true,
          commentCount: true,
          user: {
            select: { username: true, avatar: true, avatarData: true },
          },
        },
      });

      // 获取所有标签用于话题匹配
      const allTags = await prisma.tag.findMany({
        select: { id: true, name: true },
      });
      const tagMap = new Map(allTags.map(t => [t.name.toLowerCase(), t.id]));

      // 对用户提到的食物关键词进行话题匹配
      let tagMatchedPostIds: number[] = [];
      if (foodKeywords.length > 0) {
        for (const food of foodKeywords) {
          const tagId = tagMap.get(food.toLowerCase());
          if (tagId) {
            const postTags = await prisma.postTag.findMany({
              where: { tagId },
              select: { postId: true },
            });
            tagMatchedPostIds.push(...postTags.map(pt => pt.postId));
          }
        }
        tagMatchedPostIds = [...new Set(tagMatchedPostIds)];
      }

      // 获取所有城市列表（用于告诉AI平台覆盖范围）
      const cities = [...new Set(allPosts.map(p => p.address).filter(Boolean))];

      // 计算综合热度分数（点赞 + 收藏*2 + 评论*3）
      const calculateHotScore = (p: typeof allPosts[0]) => {
        return (p.likeCount || 0) * 1 + (p.favoriteCount || 0) * 2 + (p.commentCount || 0) * 3;
      };

      // 如果用户提到了具体城市，进行多维度搜索
      let locationSpecificPosts: typeof allPosts = [];
      let hasLocationData = false;
      if (detectedCity) {
        // 1. 精确匹配地址中包含城市的帖子
        const addressMatches = allPosts.filter(p => p.address && p.address.includes(detectedCity!));

        // 2. 如果有标签匹配的帖子，也纳入考虑
        const tagMatches = tagMatchedPostIds.length > 0
          ? allPosts.filter(p => tagMatchedPostIds.includes(p.id))
          : [];

        // 3. 合并去重，优先保留地址匹配的
        const combinedMap = new Map();
        addressMatches.forEach(p => combinedMap.set(p.id, { ...p, matchType: 'address' }));
        tagMatches.forEach(p => {
          if (!combinedMap.has(p.id)) {
            combinedMap.set(p.id, { ...p, matchType: 'tag' });
          }
        });

        locationSpecificPosts = Array.from(combinedMap.values());

        // 按综合热度排序
        locationSpecificPosts.sort((a, b) => calculateHotScore(b) - calculateHotScore(a));

        hasLocationData = locationSpecificPosts.length > 0;
      }

      // 如果没有指定城市但有食物关键词，搜索相关帖子
      let keywordMatchedPosts: typeof allPosts = [];
      if (!detectedCity && foodKeywords.length > 0) {
        // 搜索内容中包含关键词的帖子
        for (const keyword of foodKeywords) {
          const matches = allPosts.filter(p =>
            p.content.includes(keyword) || (p.address && p.address.includes(keyword))
          );
          matches.forEach(p => {
            if (!keywordMatchedPosts.find(kp => kp.id === p.id)) {
              keywordMatchedPosts.push(p);
            }
          });
        }
        keywordMatchedPosts.sort((a, b) => calculateHotScore(b) - calculateHotScore(a));
      }

      // 格式化帖子用于AI提示
      const formatPostForPrompt = (p: typeof allPosts[0]) => {
        const images = p.images ? JSON.parse(p.images) : [];
        const hasImage = images.length > 0 ? ' [有图片]' : ' [无图片]';
        return `${p.id}. "${p.content.substring(0, 50)}" (👍${p.likeCount || 0} ❤️${p.favoriteCount || 0} 💬${p.commentCount || 0})${hasImage} 📍${p.address || '未知位置'}`;
      };

      const formatPostForResponse = (p: typeof allPosts[0]) => {
        const images = p.images ? JSON.parse(p.images) : [];
        return {
          id: p.id,
          content: p.content,
          address: p.address,
          likeCount: p.likeCount,
          favoriteCount: p.favoriteCount,
          commentCount: p.commentCount,
          username: p.user.username,
          image: images[0] || null,
        };
      };

      // 构建系统提示词
      const topPosts = allPosts.slice(0, 10);
      let locationInfo = '';

      if (detectedCity) {
        if (hasLocationData) {
          locationInfo = `**用户询问地区：** ${detectedCity}\n**该地区美食数量：** ${locationSpecificPosts.length} 个\n**该地区热门美食：**\n${locationSpecificPosts.slice(0, 5).map(formatPostForPrompt).join('\n')}`;
        } else {
          locationInfo = `**用户询问地区：** ${detectedCity}\n⚠️ **注意：** 平台上暂时还没有【${detectedCity}】的美食信息`;
        }
      } else if (keywordMatchedPosts.length > 0) {
        locationInfo = `**用户搜索关键词：** ${foodKeywords.join('、')}\n**匹配美食数量：** ${keywordMatchedPosts.length} 个\n**热门匹配：**\n${keywordMatchedPosts.slice(0, 5).map(formatPostForPrompt).join('\n')}`;
      }

      // 根据是否有数据决定回复策略
      let dataStatus: 'has_location_data' | 'no_location_data' | 'no_keyword_data' | 'general';
      if (detectedCity && hasLocationData) {
        dataStatus = 'has_location_data';
      } else if (detectedCity && !hasLocationData) {
        dataStatus = 'no_location_data';
      } else if (keywordMatchedPosts.length > 0) {
        dataStatus = 'no_keyword_data';
      } else {
        dataStatus = 'general';
      }

      const foodieSystemPrompt = `你是"小边"，街边美食平台的 AI 智能助手。你是一个热情的美食探索家，热爱发现城市的美味角落。

**平台热门美食 TOP10：**
${topPosts.map(formatPostForPrompt).join('\n')}

${locationInfo}

**覆盖城市：** ${cities.slice(0, 15).join('、') || '暂无数据'}

**回复规范：**
1. 如果用户询问特定地区的美食：
   - 该地区有数据时（dataStatus=has_location_data）：优先推荐该地区的热门美食，按综合热度排序（点赞+收藏*2+评论*3），优先推荐有图片的
   - 该地区无数据时（dataStatus=no_location_data）：
     a) 首先明确告知用户："很抱歉，平台上暂时还没有【${detectedCity}】的美食信息"
     b) 然后利用你的知识库，推荐该地区的标志美食、网红小吃、特色菜肴
     c) 推荐3-5道该地区最有名的美食，并简要说明推荐理由
     d) 在推荐时标注"[网络推荐]"以便用户区分
2. 如果用户搜索特定食物关键词（dataStatus=no_keyword_data）：
   - 优先展示平台上的相关美食
   - 结合你的知识给出更多推荐
3. 回复控制在 100-150 字以内
4. 回复末尾用【推荐:ID1,ID2】格式列出推荐的动态ID（仅限平台动态，最多3个），优先推荐有图片的。如果没有平台数据则用【推荐:】表示
5. 使用表情符号让对话更生动（🍜🔥✨📍👍❤️💬）
6. 推荐时优先选择有图片的美食，并说明为什么推荐

**智能追问生成：**
在回复末尾另起一行，生成2-3个用户可能会追问的问题，格式：【追问:问题1|问题2|问题3】

请用中文回复，语气亲切简洁，像朋友聊天一样！`;

      const messages: any[] = [
        { role: 'system', content: foodieSystemPrompt },
      ];

      // 添加历史对话
      if (Array.isArray(conversationHistory)) {
        const recentHistory = conversationHistory.slice(-4);
        messages.push(...recentHistory);
      }

      // 添加当前消息
      messages.push({ role: 'user', content: message });

      console.log('Calling OpenAI in foodie mode...');
      console.log('Detected city:', detectedCity, 'Has location data:', hasLocationData);
      console.log('Food keywords:', foodKeywords);
      console.log('Location posts count:', locationSpecificPosts.length);
      console.log('Keyword posts count:', keywordMatchedPosts.length);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 600,
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
          .filter((id): id is number => id !== null)
          .slice(0, 5);
      }

      const cleanResponse = aiResponse.replace(/【推荐:[^\]]*】/g, '').trim();

      // 获取推荐的动态完整信息（包括图片）
      const suggestedPostsWithImages = allPosts
        .filter(p => suggestedPostIds.includes(p.id))
        .map(formatPostForResponse);

      return successResponse(res, {
        message: cleanResponse,
        suggestedPosts: suggestedPostIds,
        locationData: hasLocationData,
        city: detectedCity,
        dataStatus,
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
