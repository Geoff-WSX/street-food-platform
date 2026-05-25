import { Modal, Typography, Space, Divider } from 'antd';
import { CameraOutlined, TeamOutlined, MessageOutlined, TrophyOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  return (
    <Modal
      title={
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🍜</div>
          <Title level={4} style={{ margin: 0, color: '#ff6b35' }}>
            欢迎来到「食遇」
          </Title>
        </div>
      }
      open={open}
      onOk={onClose}
      onCancel={onClose}
      okText="开始探索"
      cancelText={null}
      centered
      width={420}
      styles={{
        body: { padding: '16px 24px 24px' }
      }}
    >
      <Divider style={{ margin: '12px 0' }} />

      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        {/* 欢迎语 */}
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <Text style={{ fontSize: 15, color: '#333' }}>
            记录城市味道 · 分享美食故事
          </Text>
        </div>

        {/* 平台介绍 */}
        <div style={{
          background: 'linear-gradient(135deg, #fff7f3 0%, #fff 100%)',
          borderRadius: 12,
          padding: '16px',
          border: '1px solid rgba(255, 107, 53, 0.1)'
        }}>
          <Paragraph style={{ margin: 0, fontSize: 14, lineHeight: 1.8 }}>
            <Text strong style={{ color: '#ff6b35' }}>「食遇」</Text> 是一个美食分享平台，
            在这里你可以发现身边隐藏的美食宝藏，记录下每一次美味的邂逅。
          </Paragraph>
        </div>

        {/* 功能介绍 */}
        <div style={{ padding: '4px 0' }}>
          <Title level={5} style={{ fontSize: 14, marginBottom: 12, color: '#666' }}>
            平台功能
          </Title>
          <Space direction="vertical" style={{ width: '100%' }} size={10}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #ff6b35 0%, #ff8e53 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 16
              }}>
                <CameraOutlined />
              </div>
              <Text style={{ fontSize: 13 }}>分享美食动态，记录美食足迹</Text>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 16
              }}>
                <TeamOutlined />
              </div>
              <Text style={{ fontSize: 13 }}>关注美食达人，发现同好</Text>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1890ff 0%, #69c0ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 16
              }}>
                <MessageOutlined />
              </div>
              <Text style={{ fontSize: 13 }}>私信交流，分享美食心得</Text>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #722ed1 0%, #b37feb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 16
              }}>
                <TrophyOutlined />
              </div>
              <Text style={{ fontSize: 13 }}>等级成长，获得称号勋章</Text>
            </div>
          </Space>
        </div>

        {/* 鼓励语 */}
        <div style={{
          textAlign: 'center',
          padding: '12px 0 4px',
          borderTop: '1px dashed #eee'
        }}>
          <Text style={{ fontSize: 13, color: '#999' }}>
            欢迎分享身边的美食，让更多人遇见美味 👋
          </Text>
        </div>
      </Space>
    </Modal>
  );
}
