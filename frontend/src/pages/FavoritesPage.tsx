import { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Input, message, Empty, Spin, Typography, Badge, Dropdown, Tooltip } from 'antd';
import { PlusOutlined, FolderOutlined, StarOutlined, EditOutlined, DeleteOutlined, StarFilled, SettingOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { getFavoriteFolders, createFavoriteFolder, renameFavoriteFolder, deleteFavoriteFolder, setDefaultFavoriteFolder, cancelDefaultFavoriteFolder, type FavoriteFolder } from '../api/favoriteFolder';
import { getUserFavorites } from '../api/post';
import { getMyLevelInfo } from '../api/level';
import type { Post } from '../types';
import PostCard from '../components/PostCard';
import { useAuthStore } from '../store/auth';

const { Text } = Typography;

export default function FavoritesPage() {
  const { isLoggedIn } = useAuthStore();
  const [folders, setFolders] = useState<FavoriteFolder[]>([]);
  const [favorites, setFavorites] = useState<Post[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FavoriteFolder | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [userLevel, setUserLevel] = useState<number>(0);

  useEffect(() => {
    loadFolders();
  }, []);

  // 获取用户等级信息
  useEffect(() => {
    if (isLoggedIn) {
      getMyLevelInfo()
        .then((data) => {
          setUserLevel(data?.currentLevel?.level || 0);
        })
        .catch(() => {
          setUserLevel(0);
        });
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (activeTab === 'all') {
      loadAllFavorites();
    } else {
      loadFavoritesByFolder(parseInt(activeTab));
    }
  }, [activeTab, folders]);

  const loadFolders = async () => {
    try {
      const data = await getFavoriteFolders();
      setFolders(data || []);
    } catch (error) {
      console.error('加载文件夹失败:', error);
      message.error('加载文件夹失败');
    }
  };

  const loadAllFavorites = async () => {
    setLoadingFavorites(true);
    try {
      const data = await getUserFavorites({ pageSize: 100 });
      setFavorites(data?.data || []);
    } catch {
      setFavorites([]);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const loadFavoritesByFolder = async (folderId: number) => {
    setLoadingFavorites(true);
    try {
      const data = await getUserFavorites({ pageSize: 100, category: String(folderId) });
      setFavorites(data?.data || []);
    } catch {
      setFavorites([]);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const handleCreateFolder = async () => {
    try {
      const values = await form.validateFields();
      await createFavoriteFolder(values.name);
      message.success('文件夹创建成功');
      setCreateModalOpen(false);
      form.resetFields();
      loadFolders();
    } catch (error: any) {
      message.error(error.response?.data?.error || error.response?.data?.message || error.message || '创建失败');
    }
  };

  const handleRenameFolder = async () => {
    if (!editingFolder) return;
    try {
      const values = await form.validateFields();
      await renameFavoriteFolder(editingFolder.id, values.name);
      message.success('文件夹重命名成功');
      setRenameModalOpen(false);
      setEditingFolder(null);
      form.resetFields();
      loadFolders();
    } catch (error: any) {
      message.error(error.response?.data?.error || error.response?.data?.message || error.message || '重命名失败');
    }
  };

  const handleDeleteFolder = async (folder: FavoriteFolder) => {
    try {
      await deleteFavoriteFolder(folder.id);
      message.success('文件夹删除成功');
      if (activeTab === String(folder.id)) {
        setActiveTab('all');
      }
      loadFolders();
    } catch (error: any) {
      message.error(error.response?.data?.error || error.response?.data?.message || error.message || '删除失败');
    }
  };

  const handleSetDefault = async (folder: FavoriteFolder) => {
    try {
      await setDefaultFavoriteFolder(folder.id);
      message.success('默认文件夹设置成功');
      loadFolders();
    } catch (error: any) {
      message.error(error.response?.data?.error || error.response?.data?.message || error.message || '设置失败');
    }
  };

  const handleCancelDefault = async () => {
    try {
      await cancelDefaultFavoriteFolder();
      message.success('已取消默认文件夹');
      loadFolders();
    } catch (error: any) {
      message.error(error.response?.data?.error || error.response?.data?.message || error.message || '操作失败');
    }
  };

  const openRenameModal = (folder: FavoriteFolder) => {
    setEditingFolder(folder);
    form.setFieldsValue({ name: folder.name });
    setRenameModalOpen(true);
  };

  const getFolderMenu = (folder: FavoriteFolder): MenuProps['items'] => [
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: '重命名',
      onClick: () => openRenameModal(folder),
    },
    ...(folder.isDefault
      ? [{ key: 'cancelDefault', icon: <StarOutlined />, label: '取消默认', onClick: handleCancelDefault }]
      : [{ key: 'setDefault', icon: <StarFilled style={{ color: '#faad14' }} />, label: '设为默认', onClick: () => handleSetDefault(folder) }]),
    { type: 'divider' as const },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
    },
  ];

  const handleMenuClick = (key: string, folder: FavoriteFolder) => {
    if (key === 'delete') {
      Modal.confirm({
        title: '确定删除此文件夹?',
        okText: '删除',
        okButtonProps: { danger: true },
        onOk: () => handleDeleteFolder(folder),
      });
    }
  };

  const totalFavorites = folders.reduce((sum, f) => sum + f._count.favorites, 0);
  const currentFolder = activeTab === 'all' ? null : folders.find(f => f.id === parseInt(activeTab));

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>我的收藏</h1>
          <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
            共 {totalFavorites} 个收藏
          </Text>
        </div>
        {isLoggedIn && userLevel >= 3 ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            新建文件夹
          </Button>
        ) : (
          <Tooltip title={isLoggedIn ? `创建文件夹需要 Lv3 美食达人（当前 Lv${userLevel || 1}）` : '请先登录'}>
            <Button type="default" icon={<PlusOutlined />} disabled>
              新建文件夹
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Unified Folder Filter */}
      {folders.length > 0 && (
        <Card size="small" style={{ marginBottom: 20, background: 'var(--bg-secondary)', border: 'none' }}>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '4px 0' }}>
            {/* All Favorites Option */}
            <div
              onClick={() => setActiveTab('all')}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 12,
                cursor: 'pointer',
                background: activeTab === 'all' ? 'var(--color-primary)' : 'var(--card-bg)',
                color: activeTab === 'all' ? '#fff' : 'var(--text-primary)',
                border: activeTab === 'all' ? 'none' : '1px solid var(--border-color)',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'all' ? 'var(--shadow-primary)' : 'none',
              }}
            >
              <FolderOutlined />
              <span style={{ fontWeight: 500 }}>全部收藏</span>
              <Badge
                count={totalFavorites}
                style={{
                  backgroundColor: activeTab === 'all' ? 'rgba(255,255,255,0.3)' : 'var(--color-primary)',
                  fontSize: 11,
                }}
              />
            </div>

            {/* Folder Items */}
            {folders.map(folder => (
              <div
                key={folder.id}
                onClick={() => setActiveTab(String(folder.id))}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  background: activeTab === String(folder.id) ? 'var(--color-primary)' : 'var(--card-bg)',
                  color: activeTab === String(folder.id) ? '#fff' : 'var(--text-primary)',
                  border: activeTab === String(folder.id) ? 'none' : '1px solid var(--border-color)',
                  transition: 'all 0.2s ease',
                  boxShadow: activeTab === String(folder.id) ? 'var(--shadow-primary)' : 'none',
                }}
              >
                {folder.isDefault ? (
                  <StarFilled style={{ color: activeTab === String(folder.id) ? '#fff' : '#faad14', fontSize: 14 }} />
                ) : (
                  <FolderOutlined />
                )}
                <span style={{ fontWeight: 500, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {folder.name}
                </span>
                <Badge
                  count={folder._count.favorites}
                  style={{
                    backgroundColor: activeTab === String(folder.id) ? 'rgba(255,255,255,0.3)' : 'var(--text-tertiary)',
                    fontSize: 11,
                  }}
                />
                <Dropdown
                  menu={{
                    items: getFolderMenu(folder),
                    onClick: ({ key }) => handleMenuClick(key, folder),
                  }}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <SettingOutlined
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontSize: 12,
                      marginLeft: 4,
                      opacity: 0.7,
                      cursor: 'pointer',
                    }}
                  />
                </Dropdown>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Favorites Grid */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeTab === 'all' ? (
              <>
                <FolderOutlined style={{ color: 'var(--color-primary)' }} />
                <span>全部收藏</span>
              </>
            ) : currentFolder ? (
              <>
                {currentFolder.isDefault ? (
                  <StarFilled style={{ color: '#faad14' }} />
                ) : (
                  <FolderOutlined style={{ color: 'var(--color-primary)' }} />
                )}
                <span>{currentFolder.name}</span>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
                  ({currentFolder._count.favorites} 个收藏)
                </Text>
              </>
            ) : (
              '收藏'
            )}
          </div>
        }
        extra={
          <Text type="secondary" style={{ fontSize: 13 }}>
            {loadingFavorites ? '加载中...' : `${favorites.length} 条内容`}
          </Text>
        }
      >
        {loadingFavorites ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : favorites.length === 0 ? (
          <Empty
            description={
              <span style={{ color: 'var(--text-tertiary)' }}>
                {activeTab === 'all' ? '暂无收藏内容' : '此文件夹暂无收藏'}
              </span>
            }
            style={{ padding: 60 }}
          />
        ) : (
          <div className="posts-grid">
            {favorites.map(post => (
              <div key={post.id}>
                <PostCard
                  post={post}
                  from="/favorites"
                  onUpdate={(updated) => {
                    setFavorites(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Folder Modal */}
      <Modal
        title="新建文件夹"
        open={createModalOpen}
        onOk={handleCreateFolder}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="文件夹名称"
            rules={[{ required: true, message: '请输入文件夹名称' }]}
          >
            <Input placeholder="请输入文件夹名称" maxLength={50} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal
        title="重命名文件夹"
        open={renameModalOpen}
        onOk={handleRenameFolder}
        onCancel={() => {
          setRenameModalOpen(false);
          setEditingFolder(null);
          form.resetFields();
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="文件夹名称"
            rules={[{ required: true, message: '请输入文件夹名称' }]}
          >
            <Input placeholder="请输入文件夹名称" maxLength={50} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
