import api from './index';

export interface ReportType {
  value: string;
  label: string;
}

export interface Report {
  id: number;
  reporterId: number;
  reportedId: number;
  type: string;
  description?: string;
  images: string[];
  chatRecords: Array<{
    senderId: number;
    senderUsername: string;
    content: string;
    createdAt: string;
  }>;
  status: 'pending' | 'reviewing' | 'resolved' | 'rejected';
  reviewerNote?: string;
  reviewerId?: number;
  reviewedAt?: string;
  adminNote?: string;
  adminId?: number;
  adminAt?: string;
  createdAt: string;
  updatedAt: string;
  reporter: {
    id: number;
    username: string;
    email?: string;
    avatar?: string;
  };
  reported: {
    id: number;
    username: string;
    email?: string;
    avatar?: string;
    role?: string;
    isActive?: boolean;
    bio?: string;
    createdAt?: string;
    _count?: {
      posts?: number;
      followers?: number;
    };
  };
  reviewer?: {
    id: number;
    username: string;
  };
  admin?: {
    id: number;
    username: string;
  };
}

export interface ReportListResponse {
  data: Report[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ReportStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  rejectedReports: number;
  typeStats: Array<{
    type: string;
    count: number;
  }>;
}

// 获取举报类型列表
export const getReportTypes = () => {
  return api.get<{ success: boolean; data: ReportType[] }>('/reports/types');
};

// 创建举报
export const createReport = (data: {
  reportedId: number;
  type: string;
  description?: string;
  images?: string[];
  chatRecords?: Array<{
    senderId: number;
    senderUsername: string;
    content: string;
    createdAt: string;
  }>;
}) => {
  return api.post('/reports', data);
};

// 获取我的举报列表
export const getMyReports = () => {
  return api.get<{ success: boolean; data: Report[]; message: string }>('/reports/my');
};

// 获取所有举报（管理员）
export const getAllReports = (params: {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
}) => {
  return api.get<{ success: boolean; data: ReportListResponse; message: string }>('/reports/all', { params });
};

// 获取举报详情（管理员）
export const getReportDetail = (id: number) => {
  return api.get<{ success: boolean; data: Report; message: string }>(`/reports/${id}`);
};

// 审核员处理举报（第一级审核）
export const reviewReport = (id: number, data: { reviewerNote?: string; recommendation: string }) => {
  return api.put(`/reports/${id}/review`, data);
};

// 管理员最终审批举报（第二级审核）
export const handleReport = (id: number, data: { status: string; adminNote?: string }) => {
  return api.put(`/reports/${id}/handle`, data);
};

// 获取举报统计（管理员）
export const getReportStats = () => {
  return api.get<{ success: boolean; data: ReportStats; message: string }>('/reports/stats');
};
