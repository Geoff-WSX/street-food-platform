import { z } from 'zod';
import api from './index';
import { reportIssue } from '../utils/monitor';

// ==================== Schema 定义 ====================

// 管理员用户 Schema - 允许 null 和 undefined
const adminUserShape = {
  id: z.number(),
  username: z.string(),
  email: z.string(),
  avatar: z.union([z.string(), z.null()]).optional(),
  avatarData: z.union([z.string(), z.null()]).optional(),
  bio: z.union([z.string(), z.null()]).optional(),
  role: z.string(),
  isActive: z.boolean(),
  allowMessage: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({
    posts: z.number(),
    likes: z.number(),
    favorites: z.number(),
    followers: z.number(),
    following: z.number(),
  }),
};

export const AdminUserSchema = z.object(adminUserShape);

// 用户列表响应 Schema
export const UserListDataSchema = z.object({
  data: z.array(AdminUserSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// 系统统计 Schema
export const SystemStatsSchema = z.object({
  totalUsers: z.number(),
  totalPosts: z.number(),
  totalLikes: z.number(),
  totalFavorites: z.number(),
  activeUsers: z.number(),
  newUsersToday: z.number(),
  adminCount: z.number(),
  reviewerCount: z.number().optional(),
  reportCount: z.number().optional(),
  superAdminCount: z.number().optional(),
});

// 用户列表响应 Schema（内部数据结构）

// 管理员操作日志 Schema
export const AdminLogSchema = z.object({
  id: z.number(),
  adminId: z.number(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.number().optional(),
  targetName: z.string().optional(),
  description: z.string(),
  oldValue: z.unknown().optional(),
  newValue: z.unknown().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.string(),
  admin: z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
    avatar: z.string().optional(),
    role: z.string(),
  }).optional(),
});

// 操作日志列表响应 Schema
export const AdminLogListResponseSchema = z.object({
  data: z.array(AdminLogSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// 操作日志统计 Schema
export const AdminLogStatsSchema = z.object({
  actionStats: z.array(z.object({
    action: z.string(),
    count: z.number(),
  })),
  adminStats: z.array(z.object({
    adminId: z.number(),
    count: z.number(),
    admin: z.object({
      id: z.number(),
      username: z.string(),
      avatar: z.string().optional(),
      role: z.string(),
    }).optional(),
  })),
  todayCount: z.number(),
});

// 操作类型 Schema
export const ActionTypeSchema = z.object({
  value: z.string(),
  label: z.string(),
  targetType: z.string(),
});

// ==================== 类型导出 ====================

export type AdminUser = z.infer<typeof AdminUserSchema>;
export type SystemStats = z.infer<typeof SystemStatsSchema>;
export type AdminLog = z.infer<typeof AdminLogSchema>;
export type AdminLogStats = z.infer<typeof AdminLogStatsSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;

// ==================== 验证辅助函数 ====================

function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown, errorMessage: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`❌ ${errorMessage}:`, result.error.issues);
    // 只记录字段名，不记录实际数据值
    const fieldNames = Object.keys(data as object).join(', ');
    console.error('📊 数据字段:', fieldNames);
    throw new Error(`${errorMessage}: ${result.error.issues[0]?.message || '验证失败'}`);
  }
  return result.data;
}

// 带错误处理的 API 调用包装器
async function withErrorHandling<T>(
  apiCall: () => Promise<{ data: T }>,
  errorMessage: string
): Promise<{ data: T }> {
  try {
    const res = await apiCall();
    if (!(res.data as { success?: boolean }).success) {
      const errMsg = (res.data as { error?: string; message?: string })?.error || (res.data as { error?: string; message?: string })?.message || errorMessage;
      console.error(`❌ API 错误 [${errorMessage}]:`, errMsg);
      // 上报问题
      reportIssue('api_error', errorMessage, errMsg);
      throw new Error(errMsg);
    }
    return res;
  } catch (error: unknown) {
    // 如果是 Zod 验证错误，直接抛出详细信息
    const zodError = error as { name?: string; message?: string; issues?: unknown };
    if (zodError.name === 'ZodError' || zodError.message?.includes('验证失败')) {
      console.error(`❌ 验证错误 [${errorMessage}]:`, zodError.issues || zodError.message);
      reportIssue('validation_error', errorMessage, zodError.message || '未知验证错误', { issues: zodError.issues });
      throw error;
    }
    const axiosError = error as { response?: { status: number; data?: { error?: string; message?: string } }; request?: unknown; message?: string };
    if (axiosError.response) {
      // HTTP 错误
      const status = axiosError.response.status;
      const errMsg = axiosError.response.data?.error || axiosError.response.data?.message || axiosError.message;
      console.error(`❌ HTTP ${status} [${errorMessage}]:`, errMsg);
      reportIssue('api_error', `${errorMessage} (HTTP ${status})`, errMsg || '未知HTTP错误');
    } else if (axiosError.request) {
      // 网络错误
      console.error(`❌ 网络错误 [${errorMessage}]: 无响应`);
      reportIssue('api_error', errorMessage, '网络错误，请检查网络连接');
      throw new Error('网络错误，请检查网络连接');
    }
    // 其他错误直接抛出
    throw error;
  }
}

// ==================== API 函数 ====================

// 获取系统统计
export const getSystemStats = () => {
  return api.get<{ success: boolean; data: SystemStats; message: string }>('/admin/stats');
};

// 获取所有用户
export const getAllUsers = (params: { page?: number; pageSize?: number; keyword?: string; role?: string }) => {
  return api.get<{ success: boolean; data: z.infer<typeof UserListDataSchema>; message: string }>('/admin/users', { params });
};

// 更新用户角色
export const updateUserRole = (userId: number, role: string) => {
  return api.put(`/admin/users/${userId}/role`, { role });
};

// 启用/禁用用户
export const toggleUserStatus = (userId: number) => {
  return api.put(`/admin/users/${userId}/status`);
};

// 重置用户密码
export const resetUserPassword = (userId: number, newPassword: string) => {
  return api.put(`/admin/users/${userId}/password`, { newPassword });
};

// 删除用户
export const deleteUser = (userId: number) => {
  return api.delete(`/admin/users/${userId}`);
};

// ==================== 管理员操作日志 API ====================

// 获取操作日志列表
export const getAdminLogs = (params?: {
  page?: number;
  pageSize?: number;
  adminId?: number;
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return api.get<{ success: boolean; data: z.infer<typeof AdminLogListResponseSchema>; message: string }>('/admin/logs', { params });
};

// 获取单个操作日志详情
export const getAdminLogById = (id: number) => {
  return api.get<{ success: boolean; data: z.infer<typeof AdminLogSchema>; message: string }>(`/admin/logs/${id}`);
};

// 获取操作统计
export const getAdminLogStats = (params?: { startDate?: string; endDate?: string }) => {
  return api.get<{ success: boolean; data: z.infer<typeof AdminLogStatsSchema>; message: string }>('/admin/logs-stats/summary', { params });
};

// 获取操作类型列表
export const getActionTypes = () => {
  return api.get<{ success: boolean; data: z.infer<typeof ActionTypeSchema>[]; message: string }>('/admin/action-types');
};

// ==================== 带验证的数据获取函数 ====================

// 获取系统统计（带验证）
export const fetchSystemStats = async (): Promise<SystemStats> => {
  const res = await withErrorHandling(() => getSystemStats(), '获取系统统计');
  return validateSchema(SystemStatsSchema, res.data.data, '系统统计数据验证失败');
};

// 获取用户列表（带验证）
export const fetchUsers = async (params?: { page?: number; pageSize?: number; keyword?: string; role?: string }) => {
  const res = await withErrorHandling(() => getAllUsers(params || {}), '获取用户列表');

  const userListData = res.data.data?.data;
  const pagination = res.data.data?.pagination;

  if (!Array.isArray(userListData)) {
    throw new Error(`用户数据格式错误: 期望数组，实际为 ${typeof userListData}`);
  }

  return {
    data: validateSchema(z.array(AdminUserSchema), userListData, '用户列表数据验证失败'),
    pagination,
  };
};

// 获取操作日志列表（带验证）
export const fetchAdminLogs = async (params?: {
  page?: number;
  pageSize?: number;
  adminId?: number;
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const res = await withErrorHandling(() => getAdminLogs(params), '获取操作日志');
  return {
    data: validateSchema(z.array(AdminLogSchema), res.data.data.data, '操作日志数据验证失败'),
    pagination: res.data.data.pagination,
  };
};

// 获取操作统计（带验证）
export const fetchAdminLogStats = async (params?: { startDate?: string; endDate?: string }): Promise<AdminLogStats> => {
  const res = await withErrorHandling(() => getAdminLogStats(params), '获取操作统计');
  return validateSchema(AdminLogStatsSchema, res.data.data, '操作统计数据验证失败');
};

// 获取操作类型列表（带验证）
export const fetchActionTypes = async (): Promise<ActionType[]> => {
  const res = await withErrorHandling(() => getActionTypes(), '获取操作类型');
  return validateSchema(z.array(ActionTypeSchema), res.data.data, '操作类型数据验证失败');
};