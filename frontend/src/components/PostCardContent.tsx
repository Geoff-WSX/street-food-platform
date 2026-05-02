import { useState } from 'react';
import { Tag } from 'antd';
import { EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { Post } from '../types';
import MapModal from './MapModal';

interface PostCardContentProps {
  post: Post;
  onLocationClick?: () => void;
}

const calculateReadingStats = (content: string) => {
  const charCount = content.replace(/\s/g, '').length;
  const readingTime = Math.ceil(charCount / 400);
  return { charCount, readingTime: Math.max(1, readingTime) };
};

const formatAddress = (address?: string) => {
  if (!address) return null;
  return address.length > 18 ? address.substring(0, 18) + '...' : address;
};

export default function PostCardContent({ post, onLocationClick }: PostCardContentProps) {
  const [showMapModal, setShowMapModal] = useState(false);

  const handleLocationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMapModal(true);
    onLocationClick?.();
  };

  return (
    <>
      <div className="post-content-area">
        <p className="post-content-text">{post.content}</p>

        {/* 阅读统计 */}
        {post.content && (
          <div className="post-stats">
            <span><ClockCircleOutlined />{calculateReadingStats(post.content).readingTime}分钟</span>
            <span>·</span>
            <span>{calculateReadingStats(post.content).charCount}字</span>
          </div>
        )}

        {/* 地址 */}
        {post.address && (
          <div
            className="post-location"
            onClick={handleLocationClick}
          >
            <EnvironmentOutlined />
            <span>{formatAddress(post.address)}</span>
          </div>
        )}

        {/* 话题标签 */}
        {post.tags && post.tags.length > 0 && (
          <div className="post-tags" style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {post.tags.slice(0, 3).map(tag => (
              <Tag
                key={tag.id}
                color="blue"
                style={{ marginRight: 0, fontSize: 11 }}
              >
                #{tag.name}
              </Tag>
            ))}
          </div>
        )}
      </div>

      {/* 地图弹窗 */}
      <MapModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        address={post.address || ''}
      />
    </>
  );
}