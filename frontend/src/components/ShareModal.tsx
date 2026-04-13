import { useState } from 'react';
import { Modal, Button, message, QRCode, Space, Typography, Input } from 'antd';
import { LinkOutlined, CopyOutlined, CheckOutlined, QqOutlined, WechatOutlined, WeiboOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Props {
  visible: boolean;
  onClose: () => void;
  postId?: number;
  postContent?: string;
}

export default function ShareModal({ visible, onClose, postId, postContent }: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl = postId ? `${window.location.origin}/post/${postId}` : window.location.href;
  const shareTitle = postContent ? `分享街头美食: ${postContent.slice(0, 50)}...` : '我在街头美食平台发现了好吃的！';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      void message.success('链接已复制');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      void message.error('复制失败');
    }
  };

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);

    const urls: Record<string, string> = {
      qq: `http://connect.qq.com/widget/shareqq/index.html?url=${encodedUrl}&title=${encodedTitle}`,
      weibo: `http://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedTitle}`,
      weixin: shareUrl, // 微信提示使用其他方式
    };

    if (platform === 'weixin') {
      void message.info('请点击右上角分享到朋友圈');
    } else {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  return (
    <Modal
      title="分享"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={400}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 分享链接 */}
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>分享链接</Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Input value={shareUrl} readOnly style={{ flex: 1 }} />
            <Button
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={handleCopyLink}
              style={{ background: copied ? '#52c41a' : '#ff6b35', color: '#fff', border: 'none' }}
            >
              {copied ? '已复制' : '复制'}
            </Button>
          </div>
        </div>

        {/* 二维码 */}
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>扫码分享</Text>
          <div style={{ marginTop: 8 }}>
            <QRCode value={shareUrl} size={150} style={{ border: '8px solid #f5f5f5' }} />
          </div>
        </div>

        {/* 社交平台 */}
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>分享到</Text>
          <Space size={16} style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
            <Button
              icon={<QqOutlined style={{ fontSize: 20 }} />}
              shape="circle"
              size="large"
              onClick={() => handleShare('qq')}
              style={{ border: '1px solid #12b7f5', color: '#12b7f5' }}
            />
            <Button
              icon={<WechatOutlined style={{ fontSize: 20 }} />}
              shape="circle"
              size="large"
              onClick={() => handleShare('weixin')}
              style={{ border: '1px solid #07c160', color: '#07c160' }}
            />
            <Button
              icon={<WeiboOutlined style={{ fontSize: 20 }} />}
              shape="circle"
              size="large"
              onClick={() => handleShare('weibo')}
              style={{ border: '1px solid #e6162d', color: '#e6162d' }}
            />
            <Button
              icon={<LinkOutlined style={{ fontSize: 20 }} />}
              shape="circle"
              size="large"
              onClick={handleCopyLink}
              style={{ border: '1px solid #ff6b35', color: '#ff6b35' }}
            />
          </Space>
        </div>
      </Space>
    </Modal>
  );
}
