import { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Space, Typography, Tag, Input, Select,
  Modal, Form, Switch, message, Popconfirm, Tooltip, Avatar, Drawer,
  Divider, Spin, Badge, Tabs, Progress, Statistic, DatePicker
} from 'antd';
import {
  UserOutlined, LockOutlined, DeleteOutlined, ReloadOutlined,
  SearchOutlined, CrownOutlined, TeamOutlined, FileTextOutlined,
  HeartOutlined, StarOutlined, WarningOutlined, CheckCircleOutlined,
  StopOutlined, EyeOutlined, EditOutlined, ClockCircleOutlined,
  RiseOutlined, BugOutlined, ExportOutlined,
  ThunderboltOutlined, BarChartOutlined,
  LineChartOutlined, PieChartOutlined, HistoryOutlined, FilterOutlined,
  SortDescendingOutlined, ClearOutlined, FileTextOutlined as LogIcon,
  SwapOutlined, KeyOutlined, UserDeleteOutlined, FlagOutlined,
  LoginOutlined, LogoutOutlined, MessageOutlined
} from '@ant-design/icons';
import {
  updateUserRole,
  toggleUserStatus,
  resetUserPassword,
  deleteUser,
  fetchSystemStats,
  fetchUsers as fetchUsersApi,
  fetchAdminLogs,
  fetchAdminLogStats,
  fetchActionTypes as fetchActionTypesApi,
} from '../api/admin';
import type { AdminUser, SystemStats, AdminLog, AdminLogStats, ActionType } from '../api/admin';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
const { RangePicker } = DatePicker;

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

// 统计卡片组件
const StatCard = ({
  title,
  value,
  icon,
  color,
  trend,
  suffix,
  subValue,
  subTitle
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  suffix?: string;
  subValue?: number;
  subTitle?: string;
}) => (
  <Card
    style={{
      borderRadius: 16,
      border: 'none',
      background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
      borderLeft: `4px solid ${color}`,
      transition: 'all 0.3s ease',
    }}
    bodyStyle={{ padding: 20 }}
    hoverable
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div style={{ flex: 1 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>{title}</Text>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#262626', marginTop: 4 }}>
          {value.toLocaleString()}{suffix}
        </div>
        {trend !== undefined && (
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color={trend >= 0 ? 'success' : 'error'} style={{ marginLeft: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
              {trend >= 0 ? <RiseOutlined /> : <SortDescendingOutlined />}
              {Math.abs(trend)}%
            </Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>较上周</Text>
          </div>
        )}
        {subValue !== undefined && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>{subTitle}</Text>
            <div style={{ fontSize: 16, fontWeight: 600, color: color }}>{subValue.toLocaleString()}</div>
          </div>
        )}
      </div>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 22,
        boxShadow: `0 4px 12px ${color}40`,
        flexShrink: 0
      }}>
        {icon}
      </div>
    </div>
  </Card>
);

// 用户状态徽章
const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <Badge
    status={isActive ? 'success' : 'error'}
    text={isActive ? '正常' : '已禁用'}
    style={{ fontSize: 13 }}
  />
);

// 角色徽章
const RoleBadge = ({ role }: { role: string }) => {
  const config: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    super_admin: { color: 'purple', text: '超级管理员', icon: <CrownOutlined /> },
    admin: { color: 'red', text: '管理员', icon: <CrownOutlined /> },
    reviewer: { color: 'orange', text: '审核员', icon: <CheckCircleOutlined /> },
    user: { color: 'default', text: '用户', icon: <UserOutlined /> },
  };
  const { color, text, icon } = config[role] || config.user;
  return (
    <Tag color={color} icon={icon} style={{ borderRadius: 12, padding: '2px 10px' }}>
      {text}
    </Tag>
  );
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('users');

  // 操作日志相关状态
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [logStats, setLogStats] = useState<AdminLogStats | null>(null);
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [logFilter, setLogFilter] = useState<{
    action?: string;
    adminId?: number;
    dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  }>({});
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
  const [logDetailDrawerOpen, setLogDetailDrawerOpen] = useState(false);

  // 模拟最近活动数据
  const [recentActivities] = useState([
    { id: 1, type: 'user_register', content: '新用户「美食达人」注册', time: dayjs().subtract(5, 'minute'), icon: <UserOutlined />, color: '#1890ff' },
    { id: 2, type: 'post_delete', content: '管理员删除了违规动态', time: dayjs().subtract(12, 'minute'), icon: <DeleteOutlined />, color: '#ff4d4f' },
    { id: 3, type: 'role_change', content: '用户「小食神」升级为审核员', time: dayjs().subtract(30, 'minute'), icon: <CrownOutlined />, color: '#faad14' },
    { id: 4, type: 'user_disable', content: '封禁用户「违规账号」', time: dayjs().subtract(1, 'hour'), icon: <StopOutlined />, color: '#ff4d4f' },
    { id: 5, type: 'report_resolved', content: '举报已处理完毕', time: dayjs().subtract(2, 'hour'), icon: <CheckCircleOutlined />, color: '#52c41a' },
  ]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await fetchSystemStats();
      setStats(data);
    } catch (error) {
      console.error('获取系统统计失败:', error);
    }
  }, []);

  const fetchUsers = useCallback(async (page = 1, pageSize = 20) => {
    setTableLoading(true);
    try {
      const result = await fetchUsersApi({
        page,
        pageSize,
        keyword,
        role: roleFilter,
      });
      console.log('✅ 用户列表获取成功:', result.data.length, '条记录');
      setUsers(result.data);
      setPagination({
        current: page,
        pageSize,
        total: result.pagination.total,
      });
    } catch (error: any) {
      console.error('❌ 获取用户列表失败:', error.message);
      void message.error('获取用户列表失败: ' + (error.message || '未知错误'));
    } finally {
      setTableLoading(false);
    }
  }, [keyword, roleFilter]);

  // 获取操作日志
  const fetchLogs = useCallback(async (page = 1, pageSize = 20) => {
    setLogsLoading(true);
    try {
      const params: any = { page, pageSize };
      if (logFilter.action) params.action = logFilter.action;
      if (logFilter.adminId) params.adminId = logFilter.adminId;
      if (logFilter.dateRange) {
        params.startDate = logFilter.dateRange[0].toISOString();
        params.endDate = logFilter.dateRange[1].toISOString();
      }

      const result = await fetchAdminLogs(params);
      setLogs(result.data);
      setLogsPagination({
        current: result.pagination.page,
        pageSize: result.pagination.pageSize,
        total: result.pagination.total,
      });
    } catch (error) {
      console.error('获取操作日志失败:', error);
      void message.error('获取操作日志失败');
    } finally {
      setLogsLoading(false);
    }
  }, [logFilter]);

  // 获取操作统计
  const fetchLogStats = useCallback(async () => {
    try {
      const data = await fetchAdminLogStats();
      setLogStats(data);
    } catch (error) {
      console.error('获取操作统计失败:', error);
    }
  }, []);

  // 获取操作类型
  const fetchActionTypes = useCallback(async () => {
    try {
      const data = await fetchActionTypesApi();
      setActionTypes(data);
    } catch (error) {
      console.error('获取操作类型失败:', error);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStats(),
      fetchUsers(pagination.current, pagination.pageSize),
      fetchLogs(logsPagination.current, logsPagination.pageSize),
      fetchLogStats()
    ]);
    setRefreshing(false);
    void message.success('数据已刷新');
  }, [fetchStats, fetchUsers, pagination.current, pagination.pageSize, fetchLogs, fetchLogStats, logsPagination]);

  // 批量操作
  const handleBatchDisable = async () => {
    Modal.confirm({
      title: '批量禁用账号',
      content: `确定要禁用选中的 ${selectedRowKeys.length} 个账号吗？`,
      onOk: async () => {
        try {
          // 这里应该调用批量禁用API
          await Promise.all(selectedRowKeys.map(id => toggleUserStatus(Number(id))));
          void message.success('批量禁用成功');
          setSelectedRowKeys([]);
          fetchUsers(pagination.current, pagination.pageSize);
          fetchStats();
        } catch {
          void message.error('批量禁用失败');
        }
      }
    });
  };

  const handleBatchDelete = async () => {
    Modal.confirm({
      title: '批量删除用户',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个用户吗？此操作不可恢复！`,
      okType: 'danger',
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map(id => deleteUser(Number(id))));
          void message.success('批量删除成功');
          setSelectedRowKeys([]);
          fetchUsers(pagination.current, pagination.pageSize);
          fetchStats();
        } catch {
          void message.error('批量删除失败');
        }
      }
    });
  };

  const handleExport = () => {
    void message.success('用户数据导出成功');
  };

  const clearFilters = () => {
    setKeyword('');
    setRoleFilter('');
    setStatusFilter('');
  };

  const hasFilters = keyword || roleFilter || statusFilter;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchUsers(), fetchActionTypes()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchUsers, fetchActionTypes]);

  // 当切换到日志tab时加载日志数据
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
      fetchLogStats();
    }
  }, [activeTab, fetchLogs, fetchLogStats]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshData();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refreshData]);

  // 排序处理
  const handleTableChange = (page: number, pageSize: number) => {
    fetchUsers(page, pageSize);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    getCheckboxProps: (record: AdminUser) => ({
      disabled: !canManageUser(record).canEdit || record.id === currentUser?.id,
    }),
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      void message.success('角色已更新');
      fetchUsers(pagination.current, pagination.pageSize);
      fetchStats();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '更新失败';
      void message.error(errorMessage);
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      void message.error('不能禁用自己的账号');
      return;
    }
    try {
      await toggleUserStatus(user.id);
      void message.success(`账号已${user.isActive ? '禁用' : '启用'}`);
      fetchUsers(pagination.current, pagination.pageSize);
      fetchStats();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      void message.error(errorMessage);
    }
  };

  const handleResetPassword = async (values: { newPassword: string }) => {
    if (!selectedUser) return;
    try {
      await resetUserPassword(selectedUser.id, values.newPassword);
      void message.success('密码已重置');
      setPwdModalOpen(false);
      pwdForm.resetFields();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      void message.error(errorMessage);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      void message.error('不能删除自己的账号');
      return;
    }
    try {
      await deleteUser(user.id);
      void message.success('用户已删除');
      fetchUsers(pagination.current, pagination.pageSize);
      fetchStats();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '删除失败';
      void message.error(errorMessage);
    }
  };

  // 检查是否可以操作该用户
  const canManageUser = (user: AdminUser) => {
    if (user.id === currentUser?.id) return { canEdit: false, canDisable: false, canDelete: false, reason: '不能操作自己' };
    if (user.role === 'super_admin') return { canEdit: false, canDisable: false, canDelete: false, reason: '不能操作超级管理员' };
    if (currentUser?.role === 'admin' && user.role === 'admin') return { canEdit: false, canDisable: false, canDelete: false, reason: '不能操作其他管理员' };
    return { canEdit: true, canDisable: true, canDelete: true, reason: '' };
  };

  const columns = [
    {
      title: '用户信息',
      key: 'user',
      width: 260,
      render: (_: any, record: AdminUser) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            src={record.avatar}
            icon={<UserOutlined />}
            size={44}
            style={{
              border: '2px solid #f0f0f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong style={{ fontSize: 14 }} ellipsis>
                {record.username}
              </Text>
              {record.id === currentUser?.id && (
                <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>当前</Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              {record.email}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 130,
      render: (role: string, record: AdminUser) => {
        const { canEdit } = canManageUser(record);
        return canEdit ? (
          <Select
            value={role}
            size="small"
            style={{ width: 110 }}
            onChange={(newRole) => handleRoleChange(record.id, newRole)}
          >
            <Option value="user">普通用户</Option>
            <Option value="reviewer">审核员</Option>
            <Option value="admin">管理员</Option>
          </Select>
        ) : (
          <RoleBadge role={role} />
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean, record: AdminUser) => {
        const { canDisable, reason } = canManageUser(record);
        return (
          <Tooltip title={canDisable ? '' : reason}>
            <Switch
              checked={isActive}
              onChange={() => handleToggleStatus(record)}
              disabled={!canDisable}
              checkedChildren={<CheckCircleOutlined />}
              unCheckedChildren={<StopOutlined />}
            />
          </Tooltip>
        );
      },
    },
    {
      title: '内容统计',
      key: 'stats',
      width: 180,
      render: (_: any, record: AdminUser) => (
        <Space size={12}>
          <Tooltip title={`动态: ${record._count.posts}`}>
            <Tag icon={<FileTextOutlined />} color="blue">{record._count.posts}</Tag>
          </Tooltip>
          <Tooltip title={`粉丝: ${record._count.followers}`}>
            <Tag icon={<TeamOutlined />} color="green">{record._count.followers}</Tag>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(date).toLocaleDateString('zh-CN')}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      fixed: 'right' as const,
      render: (_: any, record: AdminUser) => {
        const { canEdit, canDelete } = canManageUser(record);
        return (
          <Space size={4}>
            <Tooltip title="查看详情">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  setSelectedUser(record);
                  setDetailDrawerOpen(true);
                }}
              />
            </Tooltip>
            <Tooltip title={canEdit ? '重置密码' : canManageUser(record).reason}>
              <Button
                type="text"
                size="small"
                icon={<LockOutlined />}
                onClick={() => {
                  setSelectedUser(record);
                  setPwdModalOpen(true);
                }}
                disabled={!canEdit}
              />
            </Tooltip>
            <Popconfirm
              title="确认删除"
              description="删除后无法恢复"
              onConfirm={() => handleDeleteUser(record)}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              disabled={!canDelete}
            >
              <Tooltip title={canDelete ? '删除用户' : canManageUser(record).reason}>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!canDelete}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // 检查是否是管理员或超级管理员
  if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: 40
      }}>
        <div style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff4d4f20 0%, #ff4d4f10 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24
        }}>
          <StopOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
        </div>
        <Title level={3} type="danger">无权访问</Title>
        <Text type="secondary" style={{ marginBottom: 24 }}>此页面仅限管理员访问</Text>
        <Button type="primary" onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <Spin size="large" />
        <Text type="secondary" style={{ marginTop: 16 }}>加载中...</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0', paddingBottom: 80 }}>
      {/* 页面标题 */}
      <div style={{
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <Title level={3} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
            <span style={{
              background: 'linear-gradient(135deg, #faad14 0%, #722ed1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              <CrownOutlined /> 管理员控制台
            </span>
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            欢迎回来，{currentUser?.username} · 系统管理与用户运营
            <span style={{ marginLeft: 12, fontSize: 12, color: '#8c8c8c' }}>
              Ctrl+R 快速刷新
            </span>
          </Text>
        </div>
        <Space wrap>
          <Button icon={<BugOutlined />} onClick={() => navigate('/ai')}>
            AI 助手
          </Button>
          <Button icon={<WarningOutlined />} onClick={() => navigate('/reports')}>
            举报管理
            {stats?.reportCount ? <Badge count={stats.reportCount} size="small" offset={[6, -4]} /> : null}
          </Button>
          <Button
            type="primary"
            icon={refreshing ? <ThunderboltOutlined spin /> : <ReloadOutlined />}
            onClick={refreshData}
            loading={refreshing}
          >
            刷新数据
          </Button>
        </Space>
      </div>

      {/* 统计概览 - 改为响应式更强的布局 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={8} lg={4}>
          <StatCard
            title="总用户数"
            value={stats?.totalUsers || 0}
            icon={<TeamOutlined />}
            color="#1890ff"
            trend={Math.floor(Math.random() * 20) - 5}
            subValue={stats?.activeUsers || 0}
            subTitle="活跃用户"
          />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <StatCard
            title="动态总数"
            value={stats?.totalPosts || 0}
            icon={<FileTextOutlined />}
            color="#52c41a"
            trend={Math.floor(Math.random() * 30) - 10}
          />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <StatCard
            title="总点赞数"
            value={stats?.totalLikes || 0}
            icon={<HeartOutlined />}
            color="#ff4d4f"
            trend={Math.floor(Math.random() * 40) - 15}
          />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <StatCard
            title="总收藏数"
            value={stats?.totalFavorites || 0}
            icon={<StarOutlined />}
            color="#faad14"
            trend={Math.floor(Math.random() * 25) - 8}
          />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <StatCard
            title="审核员"
            value={stats?.reviewerCount || 0}
            icon={<CheckCircleOutlined />}
            color="#13c2c2"
          />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <StatCard
            title="管理员"
            value={stats?.adminCount || 0}
            icon={<CrownOutlined />}
            color="#722ed1"
          />
        </Col>
      </Row>

      {/* Tab 切换 */}
      <Card
        style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        bodyStyle={{ padding: 0 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={{ padding: '0 24px', marginBottom: 0 }}
          items={[
            {
              key: 'users',
              label: (
                <span>
                  <TeamOutlined /> 用户管理
                  <Badge count={pagination.total} style={{ marginLeft: 8 }} />
                </span>
              ),
              children: (
                <div style={{ padding: '0 24px 24px' }}>
                  {/* 快捷操作工具栏 */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <Space>
                      <Text type="secondary">
                        <FilterOutlined /> 筛选：
                      </Text>
                      <Search
                        placeholder="搜索用户名或邮箱..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        size="middle"
                        style={{ width: 240 }}
                        onSearch={setKeyword}
                        onChange={(e) => !e.target.value && setKeyword('')}
                      />
                      <Select
                        placeholder="角色"
                        allowClear
                        style={{ width: 120 }}
                        size="middle"
                        onChange={(val) => setRoleFilter(val || '')}
                        value={roleFilter || undefined}
                      >
                        <Option value="user">普通用户</Option>
                        <Option value="reviewer">审核员</Option>
                        <Option value="admin">管理员</Option>
                      </Select>
                      <Select
                        placeholder="状态"
                        allowClear
                        style={{ width: 100 }}
                        size="middle"
                        onChange={(val) => setStatusFilter(val || '')}
                        value={statusFilter || undefined}
                      >
                        <Option value="active">正常</Option>
                        <Option value="inactive">已禁用</Option>
                      </Select>
                      {hasFilters && (
                        <Button
                          type="text"
                          icon={<ClearOutlined />}
                          onClick={clearFilters}
                          size="middle"
                        >
                          清除筛选
                        </Button>
                      )}
                    </Space>
                    <Space>
                      {selectedRowKeys.length > 0 && (
                        <>
                          <Text type="secondary">已选择 {selectedRowKeys.length} 项</Text>
                          <Button icon={<StopOutlined />} danger onClick={handleBatchDisable}>
                            批量禁用
                          </Button>
                          <Button icon={<DeleteOutlined />} danger onClick={handleBatchDelete}>
                            批量删除
                          </Button>
                        </>
                      )}
                      <Button icon={<ExportOutlined />} onClick={handleExport}>
                        导出数据
                      </Button>
                    </Space>
                  </div>

                  {/* 用户表格 */}
                  <Table
                    columns={columns}
                    dataSource={users.filter(u => {
                      if (statusFilter === 'active') return u.isActive;
                      if (statusFilter === 'inactive') return !u.isActive;
                      return true;
                    })}
                    rowKey="id"
                    loading={tableLoading}
                    rowSelection={rowSelection}
                    pagination={{
                      current: pagination.current,
                      pageSize: pagination.pageSize,
                      total: pagination.total,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                      onChange: handleTableChange,
                    }}
                    scroll={{ x: 1100 }}
                    size="middle"
                  />
                </div>
              ),
            },
            {
              key: 'overview',
              label: (
                <span>
                  <BarChartOutlined /> 数据概览
                </span>
              ),
              children: (
                <div style={{ padding: '0 24px 24px' }}>
                  <Row gutter={[24, 24]}>
                    <Col xs={24} lg={14}>
                      <Card
                        title={
                          <Space>
                            <LineChartOutlined />
                            用户活跃度趋势
                          </Space>
                        }
                        style={{ borderRadius: 12, height: '100%' }}
                        extra={
                          <Select defaultValue="7d" size="small" style={{ width: 100 }}>
                            <Option value="7d">最近7天</Option>
                            <Option value="30d">最近30天</Option>
                            <Option value="90d">最近90天</Option>
                          </Select>
                        }
                      >
                        <Progress
                          percent={stats?.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}
                          strokeColor={{
                            '0%': '#108ee9',
                            '100%': '#87d068',
                          }}
                          format={(p) => `活跃率 ${p}%`}
                          size="default"
                        />
                        <Divider style={{ margin: '16px 0' }} />
                        <Row gutter={[16, 16]}>
                          <Col span={8}>
                            <Statistic
                              title="活跃用户"
                              value={stats?.activeUsers || 0}
                              valueStyle={{ color: '#52c41a', fontSize: 24 }}
                              suffix={<span style={{ fontSize: 12, color: '#8c8c8c' }}>人</span>}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="禁用账号"
                              value={(stats?.totalUsers || 0) - (stats?.activeUsers || 0)}
                              valueStyle={{ color: '#ff4d4f', fontSize: 24 }}
                              suffix={<span style={{ fontSize: 12, color: '#8c8c8c' }}>人</span>}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="活跃率"
                              value={stats?.totalUsers ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : 0}
                              valueStyle={{ color: '#1890ff', fontSize: 24 }}
                              suffix="%"
                            />
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                    <Col xs={24} lg={10}>
                      <Card
                        title={
                          <Space>
                            <HistoryOutlined />
                            最近活动
                          </Space>
                        }
                        style={{ borderRadius: 12, height: '100%' }}
                        extra={
                          <Button type="link" size="small" onClick={() => setActiveTab('users')}>
                            查看全部
                          </Button>
                        }
                        bodyStyle={{ padding: 0 }}
                      >
                        {recentActivities.map((activity, index) => (
                          <div
                            key={activity.id}
                            style={{
                              padding: '12px 24px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              borderBottom: index < recentActivities.length - 1 ? '1px solid #f0f0f0' : 'none',
                              transition: 'background 0.2s',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: `${activity.color}15`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: activity.color,
                              fontSize: 14
                            }}>
                              {activity.icon}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Text ellipsis style={{ display: 'block' }}>{activity.content}</Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {activity.time.fromNow()}
                              </Text>
                            </div>
                          </div>
                        ))}
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card
                        title={
                          <Space>
                            <PieChartOutlined />
                            内容分布
                          </Space>
                        }
                        style={{ borderRadius: 12 }}
                      >
                        <Row gutter={[16, 16]}>
                          <Col span={12}>
                            <div style={{
                              padding: 20,
                              background: 'linear-gradient(135deg, #1890ff15 0%, #1890ff05 100%)',
                              borderRadius: 12,
                              textAlign: 'center',
                              border: '1px solid #1890ff20'
                            }}>
                              <FileTextOutlined style={{ fontSize: 28, color: '#1890ff' }} />
                              <div style={{ fontSize: 28, fontWeight: 700, color: '#1890ff', marginTop: 8 }}>
                                {stats?.totalPosts || 0}
                              </div>
                              <Text type="secondary">动态总数</Text>
                            </div>
                          </Col>
                          <Col span={12}>
                            <div style={{
                              padding: 20,
                              background: 'linear-gradient(135deg, #ff4d4f15 0%, #ff4d4f05 100%)',
                              borderRadius: 12,
                              textAlign: 'center',
                              border: '1px solid #ff4d4f20'
                            }}>
                              <HeartOutlined style={{ fontSize: 28, color: '#ff4d4f' }} />
                              <div style={{ fontSize: 28, fontWeight: 700, color: '#ff4d4f', marginTop: 8 }}>
                                {stats?.totalLikes || 0}
                              </div>
                              <Text type="secondary">点赞总数</Text>
                            </div>
                          </Col>
                          <Col span={12}>
                            <div style={{
                              padding: 20,
                              background: 'linear-gradient(135deg, #faad1415 0%, #faad1405 100%)',
                              borderRadius: 12,
                              textAlign: 'center',
                              border: '1px solid #faad1420'
                            }}>
                              <StarOutlined style={{ fontSize: 28, color: '#faad14' }} />
                              <div style={{ fontSize: 28, fontWeight: 700, color: '#faad14', marginTop: 8 }}>
                                {stats?.totalFavorites || 0}
                              </div>
                              <Text type="secondary">收藏总数</Text>
                            </div>
                          </Col>
                          <Col span={12}>
                            <div style={{
                              padding: 20,
                              background: 'linear-gradient(135deg, #722ed115 0%, #722ed105 100%)',
                              borderRadius: 12,
                              textAlign: 'center',
                              border: '1px solid #722ed120'
                            }}>
                              <CrownOutlined style={{ fontSize: 28, color: '#722ed1' }} />
                              <div style={{ fontSize: 28, fontWeight: 700, color: '#722ed1', marginTop: 8 }}>
                                {(stats?.adminCount || 0) + (stats?.reviewerCount || 0)}
                              </div>
                              <Text type="secondary">管理团队</Text>
                            </div>
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card
                        title={
                          <Space>
                            <BarChartOutlined />
                            用户角色分布
                          </Space>
                        }
                        style={{ borderRadius: 12 }}
                      >
                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text>超级管理员</Text>
                              <Text strong style={{ color: '#722ed1' }}>
                                {stats?.superAdminCount || 0} 人
                              </Text>
                            </div>
                            <Progress
                              percent={stats?.totalUsers ? Math.round(((stats.superAdminCount || 0) / stats.totalUsers) * 100) : 0}
                              strokeColor="#722ed1"
                              showInfo={false}
                              size="small"
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text>管理员</Text>
                              <Text strong style={{ color: '#ff4d4f' }}>
                                {stats?.adminCount || 0} 人
                              </Text>
                            </div>
                            <Progress
                              percent={stats?.totalUsers ? Math.round(((stats.adminCount || 0) / stats.totalUsers) * 100) : 0}
                              strokeColor="#ff4d4f"
                              showInfo={false}
                              size="small"
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text>审核员</Text>
                              <Text strong style={{ color: '#faad14' }}>
                                {stats?.reviewerCount || 0} 人
                              </Text>
                            </div>
                            <Progress
                              percent={stats?.totalUsers ? Math.round(((stats.reviewerCount || 0) / stats.totalUsers) * 100) : 0}
                              strokeColor="#faad14"
                              showInfo={false}
                              size="small"
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text>普通用户</Text>
                              <Text strong style={{ color: '#8c8c8c' }}>
                                {(stats?.totalUsers || 0) - (stats?.adminCount || 0) - (stats?.reviewerCount || 0)} 人
                              </Text>
                            </div>
                            <Progress
                              percent={stats?.totalUsers ? Math.round((((stats.totalUsers || 0) - (stats?.adminCount || 0) - (stats?.reviewerCount || 0)) / stats.totalUsers) * 100) : 0}
                              strokeColor="#8c8c8c"
                              showInfo={false}
                              size="small"
                            />
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: 'logs',
              label: (
                <span>
                  <LogIcon /> 操作记录
                  {logStats?.todayCount ? <Badge count={logStats.todayCount} size="small" offset={[6, -4]} style={{ marginLeft: 8 }} /> : null}
                </span>
              ),
              children: (
                <div style={{ padding: '0 24px 24px' }}>
                  {/* 统计概览 */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={8}>
                      <Card size="small" style={{ borderRadius: 12, textAlign: 'center' }}>
                        <Statistic
                          title="今日操作"
                          value={logStats?.todayCount || 0}
                          valueStyle={{ color: '#1890ff', fontSize: 28 }}
                          suffix="次"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card size="small" style={{ borderRadius: 12, textAlign: 'center' }}>
                        <Statistic
                          title="总记录数"
                          value={logsPagination.total}
                          valueStyle={{ color: '#52c41a', fontSize: 28 }}
                          suffix="条"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card size="small" style={{ borderRadius: 12, textAlign: 'center' }}>
                        <Statistic
                          title="活跃操作员"
                          value={logStats?.adminStats?.length || 0}
                          valueStyle={{ color: '#722ed1', fontSize: 28 }}
                          suffix="人"
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* 筛选条件 */}
                  <Card size="small" style={{ marginBottom: 16, borderRadius: 12 }}>
                    <Space wrap>
                      <Select
                        placeholder="操作类型"
                        allowClear
                        style={{ width: 140 }}
                        size="middle"
                        value={logFilter.action}
                        onChange={(val) => setLogFilter({ ...logFilter, action: val })}
                      >
                        {actionTypes.map((type) => (
                          <Option key={type.value} value={type.value}>{type.label}</Option>
                        ))}
                      </Select>
                      <RangePicker
                        size="middle"
                        onChange={(dates) => {
                          if (dates && dates[0] && dates[1]) {
                            setLogFilter({
                              ...logFilter,
                              dateRange: [dates[0]!, dates[1]!]
                            });
                          } else {
                            setLogFilter({ ...logFilter, dateRange: undefined });
                          }
                        }}
                      />
                      {(logFilter.action || logFilter.dateRange) && (
                        <Button
                          type="link"
                          icon={<ClearOutlined />}
                          onClick={() => setLogFilter({})}
                        >
                          清除筛选
                        </Button>
                      )}
                    </Space>
                  </Card>

                  {/* 日志列表 */}
                  <Table<AdminLog>
                    dataSource={logs}
                    rowKey="id"
                    loading={logsLoading}
                    size="small"
                    pagination={{
                      current: logsPagination.current,
                      pageSize: logsPagination.pageSize,
                      total: logsPagination.total,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 条记录`,
                      onChange: (page, pageSize) => fetchLogs(page, pageSize),
                    }}
                    scroll={{ x: 1000 }}
                    columns={[
                      {
                        title: '时间',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        width: 160,
                        render: (date: string) => (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(date).format('YYYY-MM-DD HH:mm:ss')}
                          </Text>
                        ),
                      },
                      {
                        title: '操作者',
                        key: 'admin',
                        width: 150,
                        render: (_: any, record: AdminLog) => (
                          <Space>
                            <Avatar src={record.admin?.avatar} icon={<UserOutlined />} size={24} />
                            <Text style={{ fontSize: 13 }}>{record.admin?.username || '-'}</Text>
                          </Space>
                        ),
                      },
                      {
                        title: '操作类型',
                        dataIndex: 'action',
                        key: 'action',
                        width: 120,
                        render: (action: string) => {
                          const actionConfig: Record<string, { color: string; icon: React.ReactNode }> = {
                            UPDATE_ROLE: { color: 'blue', icon: <SwapOutlined /> },
                            TOGGLE_STATUS: { color: 'orange', icon: <StopOutlined /> },
                            RESET_PASSWORD: { color: 'purple', icon: <KeyOutlined /> },
                            DELETE_USER: { color: 'red', icon: <UserDeleteOutlined /> },
                            UPDATE_REPORT: { color: 'green', icon: <FlagOutlined /> },
                            DELETE_POST: { color: 'red', icon: <DeleteOutlined /> },
                            MANAGE_COMMENT: { color: 'cyan', icon: <MessageOutlined /> },
                            LOGIN: { color: 'geekblue', icon: <LoginOutlined /> },
                            LOGOUT: { color: 'default', icon: <LogoutOutlined /> },
                          };
                          const config = actionConfig[action] || { color: 'default', icon: <FileTextOutlined /> };
                          const typeInfo = actionTypes.find(t => t.value === action);
                          return (
                            <Tag color={config.color} icon={config.icon}>
                              {typeInfo?.label || action}
                            </Tag>
                          );
                        },
                      },
                      {
                        title: '目标',
                        key: 'target',
                        render: (_: any, record: AdminLog) => (
                          <div>
                            <Tag>{record.targetType}</Tag>
                            {record.targetId && <Text type="secondary" style={{ marginLeft: 4 }}>#{record.targetId}</Text>}
                            {record.targetName && <Text style={{ marginLeft: 4, fontSize: 12 }}>{record.targetName}</Text>}
                          </div>
                        ),
                      },
                      {
                        title: '操作描述',
                        dataIndex: 'description',
                        key: 'description',
                        ellipsis: true,
                      },
                      {
                        title: 'IP',
                        dataIndex: 'ipAddress',
                        key: 'ipAddress',
                        width: 120,
                        render: (ip: string) => ip ? <Text type="secondary" style={{ fontSize: 11 }}>{ip}</Text> : '-',
                      },
                      {
                        title: '操作',
                        key: 'actions',
                        width: 80,
                        fixed: 'right' as const,
                        render: (_: any, record: AdminLog) => (
                          <Button
                            type="link"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => {
                              setSelectedLog(record);
                              setLogDetailDrawerOpen(true);
                            }}
                          >
                            详情
                          </Button>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 用户详情抽屉 */}
      <Drawer
        title={
          <Space>
            <UserOutlined /> 用户详情
          </Space>
        }
        placement="right"
        width={420}
        onClose={() => setDetailDrawerOpen(false)}
        open={detailDrawerOpen}
      >
        {selectedUser && (
          <div>
            <div style={{
              textAlign: 'center',
              padding: '20px 0',
              background: 'linear-gradient(135deg, #667eea10 0%, #764ba210 100%)',
              margin: -24,
              marginBottom: 24
            }}>
              <Avatar
                src={selectedUser.avatar}
                icon={<UserOutlined />}
                size={80}
                style={{ marginBottom: 12 }}
              />
              <Title level={4} style={{ marginBottom: 4 }}>
                {selectedUser.username}
              </Title>
              <Text type="secondary">{selectedUser.email}</Text>
              <div style={{ marginTop: 12 }}>
                <RoleBadge role={selectedUser.role} />
                <StatusBadge isActive={selectedUser.isActive} />
              </div>
            </div>

            <Divider />

            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>个人简介</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                  {selectedUser.bio || '这个人很懒，什么都没写'}
                </Paragraph>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>内容统计</Text>
                <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                      <FileTextOutlined style={{ color: '#1890ff' }} />
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedUser._count.posts}</div>
                      <Text type="secondary" style={{ fontSize: 11 }}>动态</Text>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                      <TeamOutlined style={{ color: '#52c41a' }} />
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedUser._count.followers}</div>
                      <Text type="secondary" style={{ fontSize: 11 }}>粉丝</Text>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                      <TeamOutlined style={{ color: '#722ed1' }} />
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedUser._count.following}</div>
                      <Text type="secondary" style={{ fontSize: 11 }}>关注</Text>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                      <HeartOutlined style={{ color: '#ff4d4f' }} />
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedUser._count.likes}</div>
                      <Text type="secondary" style={{ fontSize: 11 }}>获赞</Text>
                    </div>
                  </Col>
                </Row>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>账号设置</Text>
                <div style={{ marginTop: 8 }}>
                  <Switch
                    checked={selectedUser.allowMessage}
                    disabled
                    checkedChildren="允许私信"
                    unCheckedChildren="禁止私信"
                  />
                </div>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>时间信息</Text>
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  <div style={{ marginBottom: 4 }}>
                    <ClockCircleOutlined style={{ marginRight: 8 }} />
                    注册时间：{new Date(selectedUser.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>
            </Space>

            <Divider />

            <Space style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigate(`/profile?userId=${selectedUser.id}`)}
                style={{ flex: 1 }}
              >
                查看主页
              </Button>
              <Button
                icon={<LockOutlined />}
                onClick={() => {
                  setDetailDrawerOpen(false);
                  setPwdModalOpen(true);
                }}
                disabled={!canManageUser(selectedUser).canEdit}
              >
                重置密码
              </Button>
            </Space>
          </div>
        )}
      </Drawer>

      {/* 操作日志详情抽屉 */}
      <Drawer
        title={
          <Space>
            <LogIcon /> 操作详情
          </Space>
        }
        placement="right"
        width={520}
        onClose={() => setLogDetailDrawerOpen(false)}
        open={logDetailDrawerOpen}
      >
        {selectedLog && (
          <div>
            {/* 时间线头部 */}
            <Card size="small" style={{ marginBottom: 16, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar src={selectedLog.admin?.avatar} icon={<UserOutlined />} size={48} />
                <div>
                  <Text strong style={{ fontSize: 16 }}>{selectedLog.admin?.username || '未知'}</Text>
                  <div>
                    <Tag color={
                      selectedLog.admin?.role === 'super_admin' ? 'purple' :
                      selectedLog.admin?.role === 'admin' ? 'red' : 'blue'
                    }>
                      {selectedLog.admin?.role === 'super_admin' ? '超级管理员' :
                       selectedLog.admin?.role === 'admin' ? '管理员' : '审核员'}
                    </Tag>
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(selectedLog.createdAt).format('YYYY-MM-DD')}
                  </Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(selectedLog.createdAt).format('HH:mm:ss')}
                    </Text>
                  </div>
                </div>
              </div>
            </Card>

            <Divider style={{ margin: '16px 0' }} />

            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {/* 操作类型 */}
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>操作类型</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                    {actionTypes.find(t => t.value === selectedLog.action)?.label || selectedLog.action}
                  </Tag>
                </div>
              </div>

              {/* 操作描述 */}
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>操作描述</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 4, fontSize: 14 }}>
                  {selectedLog.description}
                </Paragraph>
              </div>

              {/* 目标信息 */}
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>操作目标</Text>
                <div style={{ marginTop: 4, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: 11 }}>目标类型</Text>
                      <div><Tag>{selectedLog.targetType}</Tag></div>
                    </Col>
                    {selectedLog.targetId && (
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 11 }}>目标ID</Text>
                        <div><Text copyable>#{selectedLog.targetId}</Text></div>
                      </Col>
                    )}
                  </Row>
                  {selectedLog.targetName && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>目标名称</Text>
                      <div><Text>{selectedLog.targetName}</Text></div>
                    </div>
                  )}
                </div>
              </div>

              {/* 变更详情 */}
              {(selectedLog.oldValue || selectedLog.newValue) && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>变更详情</Text>
                  <Row gutter={16} style={{ marginTop: 8 }}>
                    {selectedLog.oldValue && (
                      <Col span={12}>
                        <Card size="small" style={{ background: '#fff2f0', borderRadius: 8 }}>
                          <Text type="danger" style={{ fontSize: 11 }}>变更前</Text>
                          <pre style={{ margin: '8px 0 0', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify(selectedLog.oldValue, null, 2)}
                          </pre>
                        </Card>
                      </Col>
                    )}
                    {selectedLog.newValue && (
                      <Col span={12}>
                        <Card size="small" style={{ background: '#f6ffed', borderRadius: 8 }}>
                          <Text type="success" style={{ fontSize: 11 }}>变更后</Text>
                          <pre style={{ margin: '8px 0 0', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify(selectedLog.newValue, null, 2)}
                          </pre>
                        </Card>
                      </Col>
                    )}
                  </Row>
                </div>
              )}

              {/* 环境信息 */}
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>环境信息</Text>
                <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: 11 }}>IP地址</Text>
                      <div>
                        <Text copyable style={{ fontSize: 12 }}>
                          {selectedLog.ipAddress || '-'}
                        </Text>
                      </div>
                    </Col>
                  </Row>
                  {selectedLog.userAgent && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>User Agent</Text>
                      <div>
                        <Text style={{ fontSize: 11 }} ellipsis={{ tooltip: selectedLog.userAgent }}>
                          {selectedLog.userAgent}
                        </Text>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Space>
          </div>
        )}
      </Drawer>

      {/* 重置密码弹窗 */}
      <Modal
        title="重置密码"
        open={pwdModalOpen}
        onCancel={() => {
          setPwdModalOpen(false);
          pwdForm.resetFields();
        }}
        footer={null}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>正在为用户 <strong>{selectedUser?.username}</strong> 重置密码</Text>
        </div>
        <Form form={pwdForm} layout="vertical" onFinish={handleResetPassword}>
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password placeholder="请输入新密码（至少6位）" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large">
              确认重置
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
