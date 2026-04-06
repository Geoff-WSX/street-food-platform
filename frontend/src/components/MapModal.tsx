import { Modal, Typography, Space, Button } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface Props {
  visible: boolean;
  onClose: () => void;
  address: string;
}

export default function MapModal({ visible, onClose, address }: Props) {
  // 打开高德地图 - 使用更稳定的 URL
  const openAmap = () => {
    // 使用高德地图的 Web 版搜索
    const url = `https://uri.amap.com/marker?position=&name=${encodeURIComponent(address)}&coordinate=wgs84&callnative=0`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 复制地址
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      // 使用 antd 的 message 需要导入，这里用简单的 alert
      alert('地址已复制到剪贴板');
    } catch {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('地址已复制到剪贴板');
    }
  };

  return (
    <Modal
      title={
        <span style={{ fontSize: 18, fontWeight: 600 }}>
          <EnvironmentOutlined style={{ color: '#ff6b35', marginRight: 8 }} />
          查看位置
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={480}
    >
      <div style={{ padding: '16px 0' }}>
        <Paragraph style={{ fontSize: 15, marginBottom: 24 }}>
          <Text strong style={{ fontSize: 16 }}>📍 </Text>
          <Text style={{ fontSize: 15 }}>{address}</Text>
        </Paragraph>

        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Text type="secondary" style={{ fontSize: 14 }}>
            选择操作：
          </Text>

          <Button
            size="large"
            block
            onClick={openAmap}
            style={{
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(255, 179, 71, 0.05) 100%)',
              border: '1px solid rgba(255, 107, 53, 0.2)',
              borderRadius: 12,
              color: '#ff6b35',
              fontWeight: 500
            }}
          >
            <span style={{ fontSize: 20, marginRight: 12 }}>🗺️</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 15, marginBottom: 2 }}>在高德地图中查看</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>打开高德地图搜索此地址</div>
            </div>
            <span style={{ fontSize: 18 }}>→</span>
          </Button>

          <Button
            size="large"
            block
            onClick={copyAddress}
            style={{
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.05) 100%)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              borderRadius: 12,
              color: '#667eea',
              fontWeight: 500
            }}
          >
            <span style={{ fontSize: 20, marginRight: 12 }}>📋</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 15, marginBottom: 2 }}>复制地址</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>复制地址到剪贴板</div>
            </div>
            <span style={{ fontSize: 18 }}>→</span>
          </Button>
        </Space>

        <div style={{ marginTop: 24, padding: '12px 16px', background: '#f5f5f5', borderRadius: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 提示：如果地图无法打开，可以复制地址后在地图应用中搜索
          </Text>
        </div>
      </div>
    </Modal>
  );
}
