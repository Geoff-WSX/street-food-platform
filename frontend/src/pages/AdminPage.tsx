import { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Button, Space, Typography, Tag, Input, Select,
  Modal, Form, Switch, message, Popconfirm, Statistic, Tooltip,
  Avatar, Drawer, Divider, Spin
} from 'antd';
import {
  UserOutlined, LockOutlined, DeleteOutlined, StopOutlined,
  CheckOutlined, EditOutlined, ReloadOutlined, SearchOutlined,
  CrownOutlined, DashboardOutlined, TeamOutlined, FileTextOutlined,
  HeartOutlined, StarOutlined, LineChartOutlined
} from '@ant-design/icons';
import {
  getSystemStats,
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  resetUserPassword,
  deleteUser
} from '../api/admin';
import type { AdminUser, SystemStats } from '../api/admin';
import { useAuthStore } from '../store/auth';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function AdminPage() {
  const { user: currentUser } = useAuthStore();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdForm] = Form.useForm();

  const fetchStats = async () => {
    try {
      const res = await getSystemStats();
      setStats(res.data?.data || res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchUsers = async (page = 1, pageSize = 20) => {
    setTableLoading(true);
    try {
      const res = await getAllUsers({
        page,
        pageSize,
        keyword,
        role: roleFilter,
      });
      const userData = res.data?.data?.data || res.data?.data || res.data || [];
      const paginationData = res.data?.data?.pagination || res.data?.pagination || { total: 0 };
      setUsers(Array.isArray(userData) ? userData : []);
      setPagination({
        current: page,
        pageSize,
        total: paginationData.total,
      });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      void message.error('获取用户列表失败');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchUsers()]);
      setLoading(false);
    };
    loadData();
  }, [keyword, roleFilter]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      void message.success('角色已更新');
      fetchUsers(pagination.current, pagination.pageSize);
    } catch (error: any) {
      void message.error(error.response?.data?.error || '更新失败');
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
    } catch (error: any) {
      void message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleResetPassword = async (values: { newPassword: string }) => {
    if (!selectedUser) return;
    try {
      await resetUserPassword(selectedUser.id, values.newPassword);
      void message.success('密码已重置');
      setPwdModalOpen(false);
      pwdForm.resetFields();
    } catch (error: any) {
      void message.error(error.response?.data?.error || '操作失败');
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
    } catch (error: any) {
      void message.error(error.response?.data?.error || '删除失败');
    }
  };

  const columns = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 200,
      render: (username: string, record: AdminUser) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            src={record.avatar}
            icon={<UserOutlined />}
            size={40}
            style={{ marginRight: 12 }}
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              {username}
              {(record.role === 'admin' || record.role === 'super_admin') && (
                <CrownOutlined style={{ color: record.role === 'super_admin' ? '#722ed1' : '#faad14', marginLeft: 8 }} />
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
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
      width: 120,
      render: (role: string, record: AdminUser) => (
        record.id === currentUser?.id || record.role === 'super_admin' ? (
          <Tag color={role === 'super_admin' ? 'purple' : role === 'admin' ? 'red' : 'default'}>
            {role === 'super_admin' ? '超级管理员' : role === 'admin' ? '管理员' : '用户'}
          </Tag>
        ) : (
          <Select
            value={role}
            size="small"
            style={{ width: 100 }}
            onChange={(newRole) => handleRoleChange(record.id, newRole)}
          >
            <Option value="user">用户</Option>
            <Option value="reviewer">审核员</Option>
            <Option value="admin">管理员</Option>
          </Select>
        )
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean, record: AdminUser) => {
        const cannotDisable = record.id === currentUser?.id || record.role === 'super_admin' ||
          (currentUser?.role === 'admin' && record.role === 'admin');
        const tooltipText = record.id === currentUser?.id ? '不能禁用自己' :
          record.role === 'super_admin' ? '不能操作超级管理员' :
          (currentUser?.role === 'admin' && record.role === 'admin') ? '不能操作其他管理员' : '';
        return (
          <Tooltip title={tooltipText}>
            <Switch
              checked={isActive}
              onChange={() => handleToggleStatus(record)}
              disabled={cannotDisable}
              checkedChildren="启用"
              unCheckedChildren="禁用"
            />
          </Tooltip>
        );
      },
    },
    {
      title: '动态',
      dataIndex: '_count',
      key: 'posts',
      width: 80,
      render: (_count: { posts: number }) => _count.posts,
    },
    {
      title: '粉丝',
      dataIndex: '_count',
      key: 'followers',
      width: 80,
      render: (_count: { followers: number }) => _count.followers,
    },
    {
      title: '关注',
      dataIndex: '_count',
      key: 'following',
      width: 80,
      render: (_count: { following: number }) => _count.following,
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: AdminUser) => {
        // 判断是否可以操作该用户
        const canResetPassword = record.id !== currentUser?.id && record.role !== 'super_admin' &&
          !(currentUser?.role === 'admin' && record.role === 'admin');
        const canDelete = record.id !== currentUser?.id && record.role !== 'super_admin' &&
          !(currentUser?.role === 'admin' && record.role === 'admin');

        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedUser(record);
                setDetailDrawerOpen(true);
              }}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              icon={<LockOutlined />}
              onClick={() => {
                setSelectedUser(record);
                setPwdModalOpen(true);
              }}
              disabled={!canResetPassword}
            >
              重置密码
            </Button>
            <Popconfirm
              title="确定要删除该用户吗？"
              description="删除后无法恢复，用户的所有数据将被删除"
              onConfirm={() => handleDeleteUser(record)}
              okText="确定"
              cancelText="取消"
              disabled={!canDelete}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={!canDelete}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // 检查是否是管理员或超级管理员
  if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <StopOutlined style={{ fontSize: 64, color: '#ff4d4f' }} />
        <Title level={3} type="danger">无权访问</Title>
        <Text type="secondary">此页面仅限管理员访问</Text>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Space direction="vertical" size={16}>
          <Spin size="large" />
          <Text type="secondary">加载中...</Text>
        </Space>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0', paddingBottom: 80 }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
          <CrownOutlined style={{ color: '#faad14', marginRight: 12 }} />
          管理员控制台
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          系统管理与用户操作
        </Text>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Card>
              <Statistic
                title={<Text type="secondary"><TeamOutlined /> 总用户</Text>}
                value={stats.totalUsers}
                valueStyle={{ color: '#1890ff', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Card>
              <Statistic
                title={<Text type="secondary"><FileTextOutlined /> 总动态</Text>}
                value={stats.totalPosts}
                valueStyle={{ color: '#52c41a', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Card>
              <Statistic
                title={<Text type="secondary"><HeartOutlined /> 总点赞</Text>}
                value={stats.totalLikes}
                valueStyle={{ color: '#ff4d4f', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Card>
              <Statistic
                title={<Text type="secondary"><StarOutlined /> 总收藏</Text>}
                value={stats.totalFavorites}
                valueStyle={{ color: '#faad14', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Card>
              <Statistic
                title={<Text type="secondary"><CheckOutlined /> 活跃用户</Text>}
                value={stats.activeUsers}
                valueStyle={{ color: '#13c2c2', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Card>
              <Statistic
                title={<Text type="secondary"><LineChartOutlined /> 今日新增</Text>}
                value={stats.newUsersToday}
                valueStyle={{ color: '#722ed1', fontSize: 24 }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 用户管理 */}
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>用户管理</span>
            <Tag color="blue">{pagination.total} 位用户</Tag>
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchUsers(pagination.current, pagination.pageSize);
              fetchStats();
            }}
          >
            刷新
          </Button>
        }
      >
        {/* 搜索和筛选 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="搜索用户名或邮箱"
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              onSearch={setKeyword}
              onChange={(e) => !e.target.value && setKeyword('')}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="筛选角色"
              allowClear
              style={{ width: '100%' }}
              size="middle"
              onChange={setRoleFilter}
            >
              <Option value="user">普通用户</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Col>
        </Row>

        {/* 用户表格 */}
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={tableLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => fetchUsers(page, pageSize),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 用户详情抽屉 */}
      <Drawer
        title="用户详情"
        placement="right"
        width={400}
        onClose={() => setDetailDrawerOpen(false)}
        open={detailDrawerOpen}
      >
        {selectedUser && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar
                src={selectedUser.avatar}
                icon={<UserOutlined />}
                size={80}
                style={{ marginBottom: 16 }}
              />
              <Title level={4} style={{ marginBottom: 8 }}>
                {selectedUser.username}
                {(selectedUser.role === 'admin' || selectedUser.role === 'super_admin') && (
                  <CrownOutlined style={{ color: selectedUser.role === 'super_admin' ? '#722ed1' : '#faad14', marginLeft: 8 }} />
                )}
              </Title>
              <Text type="secondary">{selectedUser.email}</Text>
            </div>

            <Divider />

            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div>
                <Text type="secondary">个人简介</Text>
                <Paragraph style={{ marginBottom: 0 }}>
                  {selectedUser.bio || '这个人很懒，什么都没写'}
                </Paragraph>
              </div>

              <div>
                <Text type="secondary">账号状态</Text>
                <div style={{ marginTop: 8 }}>
                  <Tag color={selectedUser.isActive ? 'success' : 'error'}>
                    {selectedUser.isActive ? '正常' : '已禁用'}
                  </Tag>
                  <Tag color={selectedUser.allowMessage ? 'blue' : 'default'}>
                    {selectedUser.allowMessage ? '允许私信' : '禁止私信'}
                  </Tag>
                </div>
              </div>

              <div>
                <Text type="secondary">数据统计</Text>
                <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                  <Col span={8}>
                    <Statistic
                      title="动态"
                      value={selectedUser._count.posts}
                      valueStyle={{ fontSize: 18 }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="粉丝"
                      value={selectedUser._count.followers}
                      valueStyle={{ fontSize: 18 }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="关注"
                      value={selectedUser._count.following}
                      valueStyle={{ fontSize: 18 }}
                    />
                  </Col>
                </Row>
              </div>

              <div>
                <Text type="secondary">时间信息</Text>
                <div style={{ marginTop: 8 }}>
                  <div>
                    <Text type="secondary">注册时间： </Text>
                    <Text>{new Date(selectedUser.createdAt).toLocaleString('zh-CN')}</Text>
                  </div>
                  <div>
                    <Text type="secondary">更新时间： </Text>
                    <Text>{new Date(selectedUser.updatedAt).toLocaleString('zh-CN')}</Text>
                  </div>
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
        <Form form={pwdForm} layout="vertical" onFinish={handleResetPassword}>
          <Form.Item label="新密码" name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password placeholder="请输入新密码（至少6位）" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              确认重置
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
