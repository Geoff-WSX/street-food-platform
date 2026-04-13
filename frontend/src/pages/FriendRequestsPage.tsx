import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, List, Avatar, Button, Space, Typography, Empty, Spin,
  message, Tabs, Badge
} from 'antd';
import {
  UserOutlined, CheckOutlined, CloseOutlined, DeleteOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import { useFriendStore } from '../store/friend';
import { PageLayout } from '../components/layout';
import { getAvatarUrl } from '../utils/images';

const { Title, Text } = Typography;

export default function FriendRequestsPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();
  const {
    receivedRequests, sentRequests,
    fetchReceivedRequests, fetchSentRequests,
    acceptRequest, rejectRequest, cancelRequest
  } = useFriendStore();

  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchReceivedRequests(), fetchSentRequests()]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      await acceptRequest(requestId);
      message.success('已添加为好友');
    } catch {
      message.error('操作失败');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      await rejectRequest(requestId);
      message.success('已拒绝');
    } catch {
      message.error('操作失败');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (requestId: number) => {
    try {
      await cancelRequest(requestId);
      message.success('已取消请求');
    } catch {
      message.error('操作失败');
    }
  };

  const renderReceivedItem = (request: any) => {
    const sender = request.sender;
    if (!sender) return null;

    return (
      <List.Item
        key={request.id}
        className="friend-request-item"
        actions={[
          <Button
            key="accept"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleAccept(request.id)}
            loading={processingId === request.id}
            style={{ borderRadius: 16, background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)', border: 'none' }}
          >
            接受
          </Button>,
          <Button
            key="reject"
            danger
            icon={<CloseOutlined />}
            onClick={() => handleReject(request.id)}
            loading={processingId === request.id}
            style={{ borderRadius: 16 }}
          >
            拒绝
          </Button>
        ]}
      >
        <List.Item.Meta
          avatar={
            <Badge dot offset={[-5, 5]} color="#52c41a">
              <Avatar
                src={getAvatarUrl(sender)}
                icon={<UserOutlined />}
                size={50}
                style={{ cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)' }}
                onClick={() => navigate(`/profile?userId=${sender.id}`)}
              />
            </Badge>
          }
          title={
            <Text
              strong
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/profile?userId=${sender.id}`)}
            >
              {sender.username}
            </Text>
          }
          description={
            <Space direction="vertical" size={2}>
              {request.message && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  附言: {request.message}
                </Text>
              )}
              <Text type="secondary" style={{ fontSize: 11 }}>
                {new Date(request.createdAt).toLocaleDateString('zh-CN')}
              </Text>
            </Space>
          }
        />
      </List.Item>
    );
  };

  const renderSentItem = (request: any) => {
    const receiver = request.receiver;
    if (!receiver) return null;

    return (
      <List.Item
        key={request.id}
        className="friend-request-item"
        actions={[
          <Button
            key="cancel"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleCancel(request.id)}
            style={{ borderRadius: 16 }}
          >
            取消
          </Button>
        ]}
      >
        <List.Item.Meta
          avatar={
            <Avatar
              src={getAvatarUrl(receiver)}
              icon={<UserOutlined />}
              size={50}
              style={{ cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)' }}
              onClick={() => navigate(`/profile?userId=${receiver.id}`)}
            />
          }
          title={
            <Text
              strong
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/profile?userId=${receiver.id}`)}
            >
              {receiver.username}
            </Text>
          }
          description={
            <Space direction="vertical" size={2}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                等待对方确认...
              </Text>
              {request.message && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  附言: {request.message}
                </Text>
              )}
              <Text type="secondary" style={{ fontSize: 11 }}>
                {new Date(request.createdAt).toLocaleDateString('zh-CN')}
              </Text>
            </Space>
          }
        />
      </List.Item>
    );
  };

  if (!isLoggedIn) return null;

  const tabItems = [
    {
      key: 'received',
      label: (
        <span>
          收到的请求
          {receivedRequests.length > 0 && (
            <Badge count={receivedRequests.length} style={{ marginLeft: 8 }} />
          )}
        </span>
      ),
      children: (
        loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : receivedRequests.length === 0 ? (
          <Empty
            description="暂无好友请求"
            style={{ padding: 40 }}
          />
        ) : (
          <List
            dataSource={receivedRequests}
            renderItem={renderReceivedItem}
          />
        )
      ),
    },
    {
      key: 'sent',
      label: (
        <span>
          发出的请求
          {sentRequests.length > 0 && (
            <Badge count={sentRequests.length} style={{ marginLeft: 8 }} />
          )}
        </span>
      ),
      children: (
        loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : sentRequests.length === 0 ? (
          <Empty
            description="暂无发出的请求"
            style={{ padding: 40 }}
          />
        ) : (
          <List
            dataSource={sentRequests}
            renderItem={renderSentItem}
          />
        )
      ),
    },
  ];

  return (
    <PageLayout background="light" className="page-content" maxWidth={800}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>
          好友请求
        </Title>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <Tabs items={tabItems} />
      </Card>
    </PageLayout>
  );
}