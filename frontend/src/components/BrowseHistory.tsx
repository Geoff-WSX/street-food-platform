import { useNavigate } from 'react-router-dom';
import { Drawer, Button, Space, Typography, Avatar, Image } from 'antd';
import { HistoryOutlined, CloseOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useBrowseHistory } from '../hooks/useBrowseHistory';
import { parseImages } from '../utils/images';
import '../styles/browseHistory.css';

const { Text, Paragraph } = Typography;

interface BrowseHistoryProps {
  visible: boolean;
  onClose: () => void;
}

export default function BrowseHistory({ visible, onClose }: BrowseHistoryProps) {
  const navigate = useNavigate();
  const { history, clearHistory, removeFromHistory } = useBrowseHistory();

  const handleItemClick = (id: number) => {
    navigate(`/post/${id}`);
    onClose();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  const getImages = (images: string[]) => {
    if (!images || images.length === 0) return [];
    return parseImages(images).slice(0, 3);
  };

  return (
    <Drawer
      title={
        <Space>
          <HistoryOutlined style={{ color: '#ff6b35' }} />
          <span style={{ fontWeight: 600 }}>浏览历史</span>
          <span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>
            ({history.length})
          </span>
        </Space>
      }
      placement="right"
      width={380}
      open={visible}
      onClose={onClose}
      extra={
        history.length > 0 && (
          <Button type="text" danger size="small" onClick={clearHistory}>
            清空全部
          </Button>
        )
      }
      styles={{ body: { padding: 0 } }}
    >
      {history.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          gap: 16
        }}>
          <span style={{ fontSize: 48 }}>📖</span>
          <Text type="secondary">暂无浏览记录</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            看看感兴趣的美食动态吧
          </Text>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => {
            const images = getImages(item.images);
            return (
              <div
                key={item.id}
                className="history-item"
                onClick={() => handleItemClick(item.id)}
              >
                {/* 图片区域 */}
                <div className="history-images">
                  {images.length > 0 ? (
                    <div className={`image-grid image-count-${images.length}`}>
                      {images.map((img, idx) => (
                        <Image
                          key={idx}
                          src={img}
                          alt=""
                          preview={false}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="history-images-placeholder">
                      <span style={{ fontSize: 32 }}>🍜</span>
                    </div>
                  )}
                </div>

                {/* 内容区域 */}
                <div className="history-content">
                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{
                      fontSize: 14,
                      marginBottom: 8,
                      lineHeight: 1.5,
                      color: 'var(--text-primary)'
                    }}
                  >
                    {item.content}
                  </Paragraph>

                  {/* 地址信息 */}
                  {item.address && (
                    <div className="history-address">
                      <EnvironmentOutlined style={{ fontSize: 12, color: '#ff6b35' }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.address}
                      </Text>
                    </div>
                  )}

                  {/* 用户和时间 */}
                  <div className="history-meta">
                    <div className="history-user">
                      <Avatar
                        size={18}
                        src={item.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.username}`}
                      >
                        {item.username[0]}
                      </Avatar>
                      <Text style={{ fontSize: 12, marginLeft: 6 }}>{item.username}</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatTime(item.visitedAt)}
                    </Text>
                  </div>
                </div>

                {/* 删除按钮 */}
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromHistory(item.id);
                  }}
                  className="history-delete-btn"
                />
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}
