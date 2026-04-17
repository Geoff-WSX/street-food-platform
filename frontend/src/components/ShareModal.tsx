import { useState, useEffect } from 'react';
import { Modal, Button, message, QRCode, Space, Typography, Input, List, Avatar, Divider, Spin } from 'antd';
import { LinkOutlined, CopyOutlined, CheckOutlined, QqOutlined, WechatOutlined, WeiboOutlined, StarOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { getShareFriends, shareToFriend, recommendPost, type Friend } from '../api/share';

const { Text } = Typography;

interface Props {
  visible: boolean;
  onClose: () => void;
  postId?: number;
  postContent?: string;
  isRecommended?: boolean;
  isOwnPost?: boolean;
}

export default function ShareModal({ visible, onClose, postId, postContent, isRecommended = false, isOwnPost = false }: Props) {
  const [copied, setCopied] = useState(false);
  const [showFriendList, setShowFriendList] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sharingToFriend, setSharingToFriend] = useState<number | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [recommended, setRecommended] = useState(isRecommended);

  const shareUrl = postId ? `${window.location.origin}/post/${postId}` : window.location.href;
  const shareTitle = postContent ? `分享美食: ${postContent.slice(0, 50)}...` : '我在食遇发现了好吃的！';

  useEffect(() => {
    if (visible && showFriendList && friends.length === 0) {
      fetchFriends();
    }
  }, [visible, showFriendList]);

  useEffect(() => {
    setRecommended(isRecommended);
  }, [isRecommended]);

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const data = await getShareFriends();
      setFriends(data || []);
    } catch {
      // API 调用失败时静默处理，不显示错误提示
      // 可能是网络问题或未登录等情况
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

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
      weixin: shareUrl,
    };

    if (platform === 'weixin') {
      void message.info('请点击右上角分享到朋友圈');
    } else {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  const handleShareToFriend = async (friendId: number) => {
    if (!postId) return;
    setSharingToFriend(friendId);
    try {
      await shareToFriend(postId, friendId);
      void message.success('分享成功');
      setShowFriendList(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      void message.error(err.response?.data?.message || '分享失败');
    } finally {
      setSharingToFriend(null);
    }
  };

  const handleRecommend = async () => {
    if (!postId) return;

    if (isOwnPost) {
      void message.warning('不能推荐自己的动态');
      return;
    }

    if (recommended) {
      void message.info('已推荐过该动态');
      return;
    }

    setRecommending(true);
    try {
      await recommendPost(postId);
      setRecommended(true);
      void message.success('推荐成功');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      void message.error(err.response?.data?.message || '推荐失败');
    } finally {
      setRecommending(false);
    }
  };

  const handleClose = () => {
    setShowFriendList(false);
    onClose();
  };

  return (
    <Modal
      title="分享"
      open={visible}
      onCancel={handleClose}
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

        <Divider style={{ margin: '8px 0' }} />

        {/* 分享给好友 */}
        <div>
          <Button
            icon={<UserSwitchOutlined />}
            onClick={() => setShowFriendList(!showFriendList)}
            block
            style={{ background: showFriendList ? '#fff0f0' : undefined }}
          >
            {showFriendList ? '收起好友列表' : '分享给好友'}
          </Button>

          {showFriendList && (
            <div style={{ marginTop: 12, maxHeight: 200, overflow: 'auto' }}>
              {loadingFriends ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin />
                </div>
              ) : friends.length === 0 ? (
                <Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: 20 }}>
                  暂无好友，请先添加好友
                </Text>
              ) : (
                <List
                  dataSource={friends}
                  renderItem={(friend) => (
                    <List.Item
                      style={{ padding: '8px 0' }}
                      actions={[
                        <Button
                          key="share"
                          size="small"
                          type="primary"
                          loading={sharingToFriend === friend.id}
                          onClick={() => handleShareToFriend(friend.id)}
                        >
                          分享
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar src={friend.avatar}>{friend.username.slice(0, 1)}</Avatar>}
                        title={friend.username}
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          )}
        </div>

        {/* 推荐功能 */}
        <div>
          <Button
            icon={<StarOutlined style={{ color: recommended ? '#faad14' : undefined }} />}
            onClick={handleRecommend}
            loading={recommending}
            disabled={recommended || isOwnPost}
            block
            style={{
              background: recommended ? '#fffbe6' : undefined,
              borderColor: recommended ? '#faad14' : undefined,
              color: recommended ? '#faad14' : undefined,
            }}
          >
            {recommended ? '已推荐' : isOwnPost ? '不能推荐自己的动态' : '推荐到我的主页'}
          </Button>
        </div>
      </Space>
    </Modal>
  );
}
