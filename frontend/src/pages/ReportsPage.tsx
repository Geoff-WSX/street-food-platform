import { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Button, Space, Typography, Tag, Select,
  Modal, Form, Input, message, Statistic, Drawer, Divider, Avatar,
  Image, List, Tabs, Badge, Spin, Radio, Descriptions, Alert
} from 'antd';
import {
  WarningOutlined, CheckOutlined, CloseOutlined, EyeOutlined,
  FileTextOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  UserOutlined, ReloadOutlined, SendOutlined, AuditOutlined,
  SafetyCertificateOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import {
  getAllReports,
  getReportDetail,
  reviewReport,
  handleReport,
  getReportStats,
} from '../api/report';
import type { Report, ReportStats } from '../api/report';
import { useAuthStore } from '../store/auth';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function ReportsPage() {
  const { user } = useAuthStore();
  const isReviewer = user?.role === 'reviewer' || user?.role === 'admin' || user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // 如果用户没有审核员或管理员权限，显示提示信息
  if (!user || !isReviewer) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Card style={{ textAlign: 'center', maxWidth: 400 }}>
          <WarningOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} />
          <Title level={4}>权限不足</Title>
          <Text type="secondary">您需要审核员或管理员权限才能访问此页面</Text>
        </Card>
      </div>
    );
  }

  const [stats, setStats] = useState<ReportStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [handleModalOpen, setHandleModalOpen] = useState(false);
  const [reviewForm] = Form.useForm();
  const [handleForm] = Form.useForm();

  const fetchStats = async () => {
    if (!isAdmin) return;
    try {
      const res = await getReportStats();
      setStats(res.data?.data || res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchReports = async (page = 1, pageSize = 20) => {
    setTableLoading(true);
    try {
      const res = await getAllReports({
        page,
        pageSize,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
      const reportsData = res.data?.data?.data || res.data?.data || res.data || [];
      const paginationData = res.data?.data?.pagination || res.data?.pagination || { total: 0 };
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setPagination({
        current: page,
        pageSize,
        total: paginationData.total,
      });
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      void message.error('获取举报列表失败');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchReports()]);
      setLoading(false);
    };
    loadData();
  }, [statusFilter, typeFilter]);

  const openDetail = async (report: Report) => {
    if (!isAdmin) {
      setSelectedReport(report);
      setDetailDrawerOpen(true);
      return;
    }
    try {
      const res = await getReportDetail(report.id);
      setSelectedReport(res.data?.data || res.data);
      setDetailDrawerOpen(true);
    } catch (error) {
      void message.error('获取详情失败');
    }
  };

  const openReviewModal = (report: Report) => {
    setSelectedReport(report);
    reviewForm.setFieldsValue({
      recommendation: 'approve',
      reviewerNote: '',
    });
    setReviewModalOpen(true);
  };

  const openHandleModal = (report: Report) => {
    setSelectedReport(report);
    handleForm.setFieldsValue({
      status: 'resolved',
      adminNote: '',
    });
    setHandleModalOpen(true);
  };

  const reviewReportSubmit = async (values: { recommendation: string; reviewerNote: string }) => {
    if (!selectedReport) return;
    try {
      await reviewReport(selectedReport.id, values);
      void message.success('审核完成，已提交给管理员审批');
      setReviewModalOpen(false);
      reviewForm.resetFields();
      fetchReports(pagination.current, pagination.pageSize);
      if (isAdmin) fetchStats();
    } catch (error: any) {
      void message.error(error.response?.data?.error || '操作失败');
    }
  };

  const handleReportSubmit = async (values: { status: string; adminNote: string }) => {
    if (!selectedReport) return;
    try {
      await handleReport(selectedReport.id, values);
      void message.success(values.status === 'resolved' ? '举报已成立' : '举报已驳回');
      setHandleModalOpen(false);
      handleForm.resetFields();
      fetchReports(pagination.current, pagination.pageSize);
      fetchStats();
    } catch (error: any) {
      void message.error(error.response?.data?.error || '操作失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string; icon?: React.ReactNode }> = {
      pending: { color: 'orange', text: '待审核', icon: <ClockCircleOutlined /> },
      reviewing: { color: 'blue', text: '待审批', icon: <AuditOutlined /> },
      resolved: { color: 'success', text: '已成立', icon: <CheckOutlined /> },
      rejected: { color: 'default', text: '已驳回', icon: <CloseOutlined /> },
    };
    const { color, text, icon } = statusMap[status] || { color: 'default', text: status };
    return (
      <Tag color={color} icon={icon}>
        {text}
      </Tag>
    );
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      spam: '垃圾信息',
      harassment: '骚扰',
      inappropriate: '不当内容',
      fake: '虚假信息',
      scam: '诈骗',
      other: '其他',
    };
    return typeMap[type] || type;
  };

  // 根据角色过滤可操作的状态
  const getAvailableActions = (record: Report) => {
    const actions = [];

    if (isReviewer && record.status === 'pending') {
      actions.push({
        key: 'review',
        label: '审核',
        icon: <AuditOutlined />,
        onClick: () => openReviewModal(record),
      });
    }

    if (isAdmin && (record.status === 'reviewing' || record.status === 'pending')) {
      actions.push({
        key: 'handle',
        label: '审批',
        icon: <CheckCircleOutlined />,
        onClick: () => openHandleModal(record),
      });
    }

    return actions;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '举报人',
      dataIndex: 'reporter',
      key: 'reporter',
      width: 150,
      render: (reporter: Report['reporter']) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            src={reporter.avatar}
            icon={<UserOutlined />}
            size={32}
            style={{ marginRight: 8 }}
          />
          <div>
            <div style={{ fontSize: 13 }}>{reporter.username}</div>
            <div style={{ fontSize: 11, color: '#999' }}>ID: {reporter.id}</div>
          </div>
        </div>
      ),
    },
    {
      title: '被举报人',
      dataIndex: 'reported',
      key: 'reported',
      width: 150,
      render: (reported: Report['reported']) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            src={reported.avatar}
            icon={<UserOutlined />}
            size={32}
            style={{ marginRight: 8 }}
          />
          <div>
            <div style={{ fontSize: 13 }}>{reported.username}</div>
            <div style={{ fontSize: 11, color: '#999' }}>ID: {reported.id}</div>
          </div>
        </div>
      ),
    },
    {
      title: '举报类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color="blue">{getTypeLabel(type)}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: Report) => {
        const actions = getAvailableActions(record);
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openDetail(record)}
            >
              详情
            </Button>
            {actions.map((action) => (
              <Button
                key={action.key}
                type="link"
                size="small"
                icon={action.icon}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </Space>
        );
      },
    },
  ];

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

  const pageTitle = isAdmin ? '举报管理中心' : '举报审核中心';
  const pageSubtitle = isAdmin ? '处理用户举报，维护社区秩序' : '审核举报内容，提交管理员审批';

  return (
    <div style={{ padding: '20px 0', paddingBottom: 80 }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
          {isAdmin ? (
            <>
              <SafetyCertificateOutlined style={{ color: '#1890ff', marginRight: 12 }} />
              {pageTitle}
            </>
          ) : (
            <>
              <AuditOutlined style={{ color: '#52c41a', marginRight: 12 }} />
              {pageTitle}
            </>
          )}
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          {pageSubtitle}
        </Text>
        <Tag color={isAdmin ? 'blue' : 'green'} style={{ marginLeft: 12 }}>
          {isAdmin ? '管理员' : '审核员'}
        </Tag>
      </div>

      {/* 统计卡片 - 仅管理员可见 */}
      {isAdmin && stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6} md={4}>
            <Card>
              <Statistic
                title={<Text type="secondary"><FileTextOutlined /> 总举报</Text>}
                value={stats.totalReports}
                valueStyle={{ color: '#1890ff', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card>
              <Statistic
                title={<Text type="secondary"><ClockCircleOutlined /> 待审核</Text>}
                value={stats.pendingReports}
                valueStyle={{ color: '#faad14', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card>
              <Statistic
                title={<Text type="secondary"><AuditOutlined /> 待审批</Text>}
                value={0}
                valueStyle={{ color: '#1890ff', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card>
              <Statistic
                title={<Text type="secondary"><CheckOutlined /> 已成立</Text>}
                value={stats.resolvedReports}
                valueStyle={{ color: '#52c41a', fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card>
              <Statistic
                title={<Text type="secondary"><CloseOutlined /> 已驳回</Text>}
                value={stats.rejectedReports}
                valueStyle={{ color: '#999', fontSize: 24 }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 举报列表 */}
      <Card
        title={
          <Space>
            <ExclamationCircleOutlined />
            <span>举报列表</span>
            <Badge count={pagination.total} />
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchReports(pagination.current, pagination.pageSize);
              if (isAdmin) fetchStats();
            }}
          >
            刷新
          </Button>
        }
      >
        {/* 筛选 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="筛选状态"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter || undefined}
              onChange={setStatusFilter}
            >
              <Option value="pending">待审核</Option>
              <Option value="reviewing">待审批</Option>
              <Option value="resolved">已成立</Option>
              <Option value="rejected">已驳回</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="筛选类型"
              allowClear
              style={{ width: '100%' }}
              value={typeFilter || undefined}
              onChange={setTypeFilter}
            >
              <Option value="spam">垃圾信息</Option>
              <Option value="harassment">骚扰</Option>
              <Option value="inappropriate">不当内容</Option>
              <Option value="fake">虚假信息</Option>
              <Option value="scam">诈骗</Option>
              <Option value="other">其他</Option>
            </Select>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={tableLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => fetchReports(page, pageSize),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 详情抽屉 */}
      <Drawer
        title="举报详情"
        placement="right"
        width={500}
        onClose={() => setDetailDrawerOpen(false)}
        open={detailDrawerOpen}
      >
        {selectedReport && (
          <div>
            {/* 基本信息 */}
            <div style={{ marginBottom: 20 }}>
              <Title level={5}>基本信息</Title>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="举报ID">#{selectedReport.id}</Descriptions.Item>
                <Descriptions.Item label="状态">{getStatusTag(selectedReport.status)}</Descriptions.Item>
                <Descriptions.Item label="类型">
                  <Tag color="blue">{getTypeLabel(selectedReport.type)}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {new Date(selectedReport.createdAt).toLocaleString('zh-CN')}
                </Descriptions.Item>
                {selectedReport.reviewedAt && (
                  <Descriptions.Item label="审核时间">
                    {new Date(selectedReport.reviewedAt).toLocaleString('zh-CN')}
                  </Descriptions.Item>
                )}
                {selectedReport.reviewer && (
                  <Descriptions.Item label="审核人">
                    {selectedReport.reviewer.username}
                  </Descriptions.Item>
                )}
                {selectedReport.adminAt && (
                  <Descriptions.Item label="审批时间">
                    {new Date(selectedReport.adminAt).toLocaleString('zh-CN')}
                  </Descriptions.Item>
                )}
                {selectedReport.admin && (
                  <Descriptions.Item label="审批人">
                    {selectedReport.admin.username}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>

            <Divider />

            {/* 举报人信息 */}
            <div style={{ marginBottom: 20 }}>
              <Title level={5}>举报人</Title>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  src={selectedReport.reporter.avatar}
                  icon={<UserOutlined />}
                  size={48}
                  style={{ marginRight: 12 }}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>{selectedReport.reporter.username}</div>
                  <Text type="secondary">{selectedReport.reporter.email}</Text>
                </div>
              </div>
            </div>

            <Divider />

            {/* 被举报人信息 */}
            <div style={{ marginBottom: 20 }}>
              <Title level={5}>被举报人</Title>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <Avatar
                  src={selectedReport.reported.avatar}
                  icon={<UserOutlined />}
                  size={48}
                  style={{ marginRight: 12 }}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {selectedReport.reported.username}
                    {selectedReport.reported.role === 'admin' && (
                      <Tag color="red" style={{ marginLeft: 8 }}>管理员</Tag>
                    )}
                  </div>
                  <Text type="secondary">{selectedReport.reported.email}</Text>
                </div>
              </div>
              {selectedReport.reported._count && (
                <Space>
                  <Text type="secondary">动态: {selectedReport.reported._count.posts}</Text>
                  <Text type="secondary">粉丝: {selectedReport.reported._count.followers}</Text>
                </Space>
              )}
            </div>

            <Divider />

            {/* 举报描述 */}
            {selectedReport.description && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <Title level={5}>举报描述</Title>
                  <Paragraph style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                    {selectedReport.description}
                  </Paragraph>
                </div>
                <Divider />
              </>
            )}

            {/* 证据图片 */}
            {selectedReport.images && selectedReport.images.length > 0 && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <Title level={5}>证据图片</Title>
                  <Image.PreviewGroup>
                    <Space wrap>
                      {selectedReport.images.map((img, index) => (
                        <Image
                          key={index}
                          src={img}
                          width={100}
                          height={100}
                          style={{ objectFit: 'cover', borderRadius: 4 }}
                        />
                      ))}
                    </Space>
                  </Image.PreviewGroup>
                </div>
                <Divider />
              </>
            )}

            {/* 聊天记录 */}
            {selectedReport.chatRecords && selectedReport.chatRecords.length > 0 && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <Title level={5}>聊天记录</Title>
                  <List
                    dataSource={selectedReport.chatRecords}
                    renderItem={(item: any) => (
                      <List.Item>
                        <div style={{ width: '100%' }}>
                          <div style={{ marginBottom: 4 }}>
                            <Text strong>{item.senderUsername}</Text>
                            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                              {new Date(item.createdAt).toLocaleString('zh-CN')}
                            </Text>
                          </div>
                          <Text>{item.content}</Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </div>
                <Divider />
              </>
            )}

            {/* 审核员备注 */}
            {selectedReport.reviewerNote && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <Title level={5}>审核员备注</Title>
                  <Alert
                    message={selectedReport.reviewerNote}
                    type="info"
                    showIcon
                  />
                </div>
                <Divider />
              </>
            )}

            {/* 管理员备注 */}
            {selectedReport.adminNote && (
              <>
                <div>
                  <Title level={5}>管理员备注</Title>
                  <Alert
                    message={selectedReport.adminNote}
                    type="success"
                    showIcon
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* 审核员审核弹窗 */}
      <Modal
        title={
          <Space>
            <AuditOutlined />
            <span>审核举报</span>
          </Space>
        }
        open={reviewModalOpen}
        onCancel={() => {
          setReviewModalOpen(false);
          reviewForm.resetFields();
        }}
        footer={null}
      >
        <Form form={reviewForm} layout="vertical" onFinish={reviewReportSubmit}>
          <Alert
            message="审核说明"
            description="请仔细检查举报内容和证据，判断被举报用户是否存在违规行为"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item label="审核结果" name="recommendation" rules={[{ required: true }]}>
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="approve">
                  <Space>
                    <CheckOutlined style={{ color: '#52c41a' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>确认违规</div>
                      <div style={{ fontSize: 12, color: '#999' }}>被举报用户确实存在违规行为，建议处罚</div>
                    </div>
                  </Space>
                </Radio>
                <Radio value="reject">
                  <Space>
                    <CloseOutlined style={{ color: '#999' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>未发现违规</div>
                      <div style={{ fontSize: 12, color: '#999' }}>证据不足或用户未违规，建议驳回举报</div>
                    </div>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="审核说明" name="reviewerNote" rules={[{ required: true }]}>
            <TextArea
              rows={4}
              placeholder="请详细说明审核判断理由，例如：检查了哪些证据、发现了什么问题、依据什么规则等"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setReviewModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
                提交审核
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 管理员审批弹窗 */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined />
            <span>最终审批</span>
          </Space>
        }
        open={handleModalOpen}
        onCancel={() => {
          setHandleModalOpen(false);
          handleForm.resetFields();
        }}
        footer={null}
      >
        {selectedReport && selectedReport.reviewer && (
          <Alert
            message={
              <Space>
                <span>审核员（小边）意见</span>
                <Tag color={selectedReport.reviewerNote?.includes('确认违规') ? 'red' : 'green'}>
                  {selectedReport.reviewerNote?.includes('approve') ? '确认违规' : '未发现违规'}
                </Tag>
              </Space>
            }
            description={selectedReport.reviewerNote}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={handleForm} layout="vertical" onFinish={handleReportSubmit}>
          <Alert
            message="审批说明"
            description="请根据审核员的意见和实际情况，做出最终决定。您拥有最终决定权，可以批准或驳回审核员的建议"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item label="最终决定" name="status" rules={[{ required: true }]}>
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="resolved">
                  <Space>
                    <CheckOutlined style={{ color: '#52c41a' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>批准处罚</div>
                      <div style={{ fontSize: 12, color: '#999' }}>同意审核员的违规认定，对被举报用户执行处罚</div>
                    </div>
                  </Space>
                </Radio>
                <Radio value="rejected">
                  <Space>
                    <CloseOutlined style={{ color: '#999' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>驳回举报</div>
                      <div style={{ fontSize: 12, color: '#999' }}>不认可违规认定，驳回本次举报</div>
                    </div>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="审批备注" name="adminNote">
            <TextArea
              rows={4}
              placeholder="请说明审批理由和后续处理措施（可选）"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setHandleModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                确认审批
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
