import { useState, useEffect, useCallback } from 'react';
import { Col, Row, Spin, Button, Empty, Typography } from 'antd';
import { getPosts } from '../api/post';
import PostCard from '../components/PostCard';
import type { Post } from '../types';

const { Title } = Typography;

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchPosts = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await getPosts({ page: p, pageSize: 12 });
      setPosts((prev) => (p === 1 ? data.data : [...prev, ...data.data]));
      setTotalPages(data.pagination.totalPages);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(1); }, [fetchPosts]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(next);
  };

  const handleUpdate = (updated: Partial<Post> & { id: number }) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  };

  if (initialLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div style={{ padding: '24px 0' }}>
      <Title level={4} style={{ marginBottom: 24 }}>最新动态</Title>
      {posts.length === 0 ? (
        <Empty description="暂无动态，快来发布第一条吧！" />
      ) : (
        <Row gutter={[16, 16]}>
          {posts.map((post) => (
            <Col key={post.id} xs={24} sm={12} md={8} lg={6}>
              <PostCard post={post} onUpdate={handleUpdate} />
            </Col>
          ))}
        </Row>
      )}
      {page < totalPages && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button onClick={loadMore} loading={loading} size="large">
            加载更多
          </Button>
        </div>
      )}
    </div>
  );
}
