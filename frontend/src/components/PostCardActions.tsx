import { HeartOutlined, HeartFilled, StarOutlined, StarFilled, CommentOutlined } from '@ant-design/icons';

interface PostCardActionsProps {
  liked: boolean;
  favorited: boolean;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  onLike: (e: React.MouseEvent) => void;
  onFavorite: (e: React.MouseEvent) => void;
  onComment: (e: React.MouseEvent) => void;
  likeLoading?: boolean;
  favoriteLoading?: boolean;
}

function ActionButton({
  type, active = false, count = 0, onClick, loading = false
}: {
  type: 'like' | 'favorite' | 'comment';
  active?: boolean;
  count?: number;
  onClick?: (e: React.MouseEvent) => void;
  loading?: boolean;
}) {
  const icons = {
    like: { active: <HeartFilled />, inactive: <HeartOutlined /> },
    favorite: { active: <StarFilled />, inactive: <StarOutlined /> },
    comment: { active: <CommentOutlined />, inactive: <CommentOutlined /> },
  };
  const labels = { like: '赞', favorite: '藏', comment: '评' };

  return (
    <button
      className={`action-btn-urban ${type} ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={loading}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {active ? icons[type].active : icons[type].inactive}
        <span>{count > 0 ? count : labels[type]}</span>
      </span>
    </button>
  );
}

export default function PostCardActions({
  liked,
  favorited,
  likeCount,
  favoriteCount,
  commentCount,
  onLike,
  onFavorite,
  onComment,
}: PostCardActionsProps) {
  return (
    <div className="post-actions">
      <ActionButton type="like" active={liked} count={likeCount} onClick={onLike} />
      <ActionButton type="favorite" active={favorited} count={favoriteCount} onClick={onFavorite} />
      <ActionButton type="comment" count={commentCount} onClick={onComment} />
    </div>
  );
}