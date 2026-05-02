import { useState, useMemo } from 'react';
import type { Post } from '../types';
import { parseImages } from '../utils/images';

interface PostCardImageProps {
  post: Post;
  rankBadge?: { badge: string; className: string } | null;
  rank?: number;
}

const getRandomFood = () => {
  const foods = ['🍜', '🍕', '🍔', '🍣', '🥘', '🌮', '🥡', '🍱', '🥙', '🥪'];
  return foods[Math.floor(Math.random() * foods.length)];
};

export default function PostCardImage({ post, rankBadge, rank }: PostCardImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const processedImages = useMemo(() => {
    return parseImages(post.images);
  }, [post.images]);

  return (
    <>
      {/* 排名徽章 */}
      {rankBadge && (
        <div className={`rank-badge-urban ${rankBadge.className}`}>
          {rankBadge.badge}
        </div>
      )}
      {rank !== undefined && rank > 2 && (
        <div className="rank-badge-urban default">{rank + 1}</div>
      )}

      {/* 图片区域 */}
      <div className="post-image-container">
        {processedImages.length > 0 && !imageError ? (
          <img
            src={processedImages[0]}
            alt="post"
            className={imageLoaded ? 'loaded' : 'loading'}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="post-placeholder">{getRandomFood()}</div>
        )}

        {/* 多图标记 */}
        {processedImages.length > 1 && (
          <div className="multi-image-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
            {processedImages.length}
          </div>
        )}
      </div>
    </>
  );
}