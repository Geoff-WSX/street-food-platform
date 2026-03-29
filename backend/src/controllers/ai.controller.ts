import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import OpenAI from 'openai';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
                    name: functionName,
                    content: JSON.stringify(result),
                  });
                  console.log(`Tool ${functionName} result:`, JSON.stringify(result).substring(0, 200));
                } catch (toolError: any) {
                  console.error(`Tool ${functionName} error:`, toolError.message);
                  toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    name: functionName,
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

    // 获取动态数据（限制数量）
    console.log('Fetching posts...');
    const allPosts = await prisma.post.findMany({
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
          select: {
            username: true,
          },
        },
      },
    });
    console.log('Found posts:', allPosts.length);

    // 构建简化的数据摘要
    const postsSummary = allPosts.map(post => ({
      id: post.id,
      content: post.content.substring(0, 50),
      address: post.address,
      likeCount: post.likeCount || 0,
      username: post.user.username,
    }));

    // 统计信息
    const cities = [...new Set(allPosts.map(p => p.address).filter(Boolean))].slice(0, 8);

    // 美食模式的系统提示词
    const foodieSystemPrompt = `你是"小边"，街边美食平台的 AI 智能助手。

**当前平台数据：**
- 总动态数：${allPosts.length}
- 覆盖城市：${cities.join('、')}

**热门动态：**
${postsSummary.map((p, i) => `${i+1}. [ID:${p.id}] "${p.content}" (${p.likeCount}赞) 📍${p.address || '未知位置'}`).join('\n')}

**任务：**
1. 根据用户需求分析上述数据
2. 回复控制在 100 字以内
3. 回复末尾用【推荐:ID1,ID2】格式列出推荐的动态ID
4. 如果没有相关推荐，用【推荐:】表示

请用中文回复，语气亲切简洁。`;

    // 构建消息
    const messages: any[] = [
      { role: 'system', content: foodieSystemPrompt },
    ];

    // 添加历史对话（限制最近3条）
    if (Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-6);
      messages.push(...recentHistory);
    }

    // 添加当前消息
    messages.push({ role: 'user', content: message });

    // 调用 OpenAI API
    console.log('Calling OpenAI...');
    console.log('API Key (first 10 chars):', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });
      console.log('OpenAI Response received');
    } catch (openaiError: any) {
      console.error('OpenAI Error Details:', {
        name: openaiError.name,
        message: openaiError.message,
        status: openaiError.status,
        type: openaiError.type,
        cause: openaiError.cause,
        code: openaiError.code,
      });
      console.error('Full error stack:', openaiError.stack);

      // 处理连接超时错误
      if (openaiError.name === 'APIConnectionTimeoutError' || openaiError.message?.includes('timed out')) {
        return errorResponse(
          res,
          'AI 服务连接超时，请检查网络连接或稍后重试',
          'OPENAI_TIMEOUT',
          504
        );
      }

      // 处理连接错误
      if (openaiError.message?.includes('Connection error') || openaiError.name === 'APIConnectionError') {
        return errorResponse(
          res,
          '无法连接到 OpenAI 服务，请检查网络或 API Key 配置',
          'OPENAI_CONNECTION_ERROR',
          503
        );
      }

      // 处理认证错误
      if (openaiError.status === 401) {
        return errorResponse(
          res,
          'OpenAI API Key 无效，请联系管理员',
          'INVALID_API_KEY',
          401
        );
      }

      // 处理其他响应错误
      if (openaiError.response) {
        return errorResponse(
          res,
          `OpenAI API 错误: ${openaiError.response.data?.error?.message || openaiError.message}`,
          'OPENAI_ERROR',
          openaiError.status || 500
        );
      }

      // 其他未知错误
      return errorResponse(
        res,
        `AI 服务错误: ${openaiError.message}`,
        'AI_ERROR',
        500
      );
    }

    const aiResponse = completion.choices[0].message.content || '';
    console.log('AI Response:', aiResponse);

    // 提取推荐的动态ID（支持多种格式：【推荐:ID1,ID2】、【推荐:ID1, ID2】、【推荐:1,2】）
    const match = aiResponse.match(/【推荐:([^\]]*)】/);
    console.log('Regex match:', match);

    let suggestedPostIds: number[] = [];
    if (match && match[1]) {
      suggestedPostIds = match[1].split(',')
        .map(id => {
          // 移除可能存在的 ID 前缀（不区分大小写）
          const cleanId = id.replace(/^ID/i, '').trim();
          const numId = parseInt(cleanId);
          return isNaN(numId) ? null : numId;
        })
        .filter((id): id is number => id !== null);
    }

    const finalMessage = aiResponse.replace(/【推荐:[^\]]*】/g, '').trim();

    console.log('Final Message:', finalMessage);
    console.log('Suggested IDs:', suggestedPostIds);

    return successResponse(res, {
      message: finalMessage,
      suggestedPosts: suggestedPostIds,
    });
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
