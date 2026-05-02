import { useState, useEffect, useMemo } from 'react';
import { Modal, Radio, Button, Input, Space, Typography, message, Popconfirm } from 'antd';
import { FolderOutlined, SearchOutlined, EditOutlined, DeleteOutlined, StarFilled } from '@ant-design/icons';
import { getFavoriteFolders, createFavoriteFolder, renameFavoriteFolder, deleteFavoriteFolder, setDefaultFavoriteFolder, cancelDefaultFavoriteFolder, type FavoriteFolder } from '../api/favoriteFolder';

const { Text } = Typography;

interface FavoriteFolderSelectProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (folderId: number | null) => void;
  currentFolderId?: number | null;
}

export default function FavoriteFolderSelect({ visible, onClose, onConfirm, currentFolderId }: FavoriteFolderSelectProps) {
  const [folders, setFolders] = useState<FavoriteFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (visible) {
      loadFolders();
    }
  }, [visible]);

  useEffect(() => {
    if (folders.length > 0) {
      // 如果有默认文件夹，默认选中它
      const defaultFolder = folders.find(f => f.isDefault);
      if (defaultFolder && currentFolderId === undefined) {
        setSelectedFolderId(defaultFolder.id);
      } else if (currentFolderId !== undefined) {
        setSelectedFolderId(currentFolderId);
      }
    }
  }, [folders, currentFolderId]);

  // 根据输入过滤文件夹列表
  const filteredFolders = useMemo(() => {
    if (!newFolderName.trim()) return folders;
    const search = newFolderName.trim().toLowerCase();
    return folders.filter(f => f.name.toLowerCase().includes(search));
  }, [folders, newFolderName]);

  // 检查是否有重复的文件夹名称
  const duplicateFolder = useMemo(() => {
    if (!newFolderName.trim()) return null;
    return folders.find(f => f.name.toLowerCase() === newFolderName.trim().toLowerCase());
  }, [folders, newFolderName]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const data = await getFavoriteFolders();
      setFolders(data);
    } catch {
      void message.error('加载收藏文件夹失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (folderId: number) => {
    if (!editingName.trim()) {
      void message.warning('请输入文件夹名称');
      return;
    }
    try {
      const updated = await renameFavoriteFolder(folderId, editingName.trim());
      setFolders(folders.map(f => f.id === folderId ? { ...updated, _count: updated._count || f._count } : f));
      setEditingId(null);
      setEditingName('');
      void message.success('重命名成功');
    } catch (error: any) {
      void message.error(error.response?.data?.error || error.response?.data?.message || '重命名失败');
    }
  };

  const handleDelete = async (folderId: number) => {
    try {
      await deleteFavoriteFolder(folderId);
      setFolders(folders.filter(f => f.id !== folderId));
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      void message.success('删除成功');
    } catch (error: any) {
      void message.error(error.response?.data?.error || error.response?.data?.message || '删除失败');
    }
  };

  const handleSetDefault = async (folderId: number) => {
    try {
      await setDefaultFavoriteFolder(folderId);
      setFolders(folders.map(f => ({ ...f, isDefault: f.id === folderId })));
      void message.success('已设为默认文件夹');
    } catch {
      void message.error('设置失败');
    }
  };

  const handleCancelDefault = async () => {
    try {
      await cancelDefaultFavoriteFolder();
      setFolders(folders.map(f => ({ ...f, isDefault: false })));
      void message.success('已取消默认文件夹');
    } catch {
      void message.error('取消失败');
    }
  };

  const handleConfirm = async () => {
    try {
      let folderId = selectedFolderId;
      // 如果输入了新文件夹名称
      if (newFolderName.trim()) {
        // 检查是否已存在同名文件夹
        const existing = folders.find(f => f.name.toLowerCase() === newFolderName.trim().toLowerCase());
        if (existing) {
          // 使用已存在的文件夹
          folderId = existing.id;
        } else {
          // 创建新文件夹
          const newFolder = await createFavoriteFolder(newFolderName.trim());
          folderId = newFolder.id;
        }
      }
      onConfirm(folderId);
      onClose();
    } catch (error: any) {
      void message.error(error.response?.data?.error || error.response?.data?.message || '操作失败');
    }
  };

  return (
    <Modal
      title="选择收藏文件夹"
      open={visible}
      onCancel={onClose}
      onOk={handleConfirm}
      okText="确认收藏"
      cancelText="取消"
      width={480}
    >
      <div style={{ minHeight: 200 }}>
        {/* 新建文件夹输入 */}
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="输入名称搜索或创建文件夹"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            prefix={<SearchOutlined />}
            style={{ marginBottom: 8 }}
          />
          {newFolderName && (
            duplicateFolder ? (
              <Text type="danger" style={{ fontSize: 12 }}>
                <StarFilled style={{ color: '#ff4d4f', fontSize: 10 }} /> 文件夹「{duplicateFolder.name}」已存在，可直接选择或创建新名称
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                确认后将创建新文件夹「{newFolderName}」并收藏到此文件夹
              </Text>
            )
          )}
        </div>

        {/* 根目录选项 */}
        <div
          style={{
            padding: '12px',
            borderRadius: 8,
            border: selectedFolderId === null ? '2px solid #ff6b35' : '1px solid #d9d9d9',
            marginBottom: 12,
            cursor: 'pointer',
            background: selectedFolderId === null ? '#fff7f0' : 'transparent',
          }}
          onClick={() => setSelectedFolderId(null)}
        >
          <Radio checked={selectedFolderId === null}>
            <Space>
              <FolderOutlined style={{ fontSize: 16 }} />
              <Text>根目录</Text>
            </Space>
          </Radio>
        </div>

        {/* 文件夹列表 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Text type="secondary">加载中...</Text>
          </div>
        ) : folders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Text type="secondary">暂无收藏文件夹</Text>
          </div>
        ) : filteredFolders.length === 0 && newFolderName ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Text type="secondary">没有找到包含「{newFolderName}」的文件夹</Text>
          </div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {filteredFolders.map(folder => (
              <div
                key={folder.id}
                style={{
                  padding: '12px',
                  borderRadius: 8,
                  border: selectedFolderId === folder.id ? '2px solid #ff6b35' : '1px solid #d9d9d9',
                  marginBottom: 8,
                  cursor: 'pointer',
                  background: selectedFolderId === folder.id ? '#fff7f0' : 'transparent',
                }}
                onClick={() => setSelectedFolderId(folder.id)}
              >
                {editingId === folder.id ? (
                  <div onClick={e => e.stopPropagation()}>
                    <Input
                      defaultValue={folder.name}
                      onPressEnter={() => handleRename(folder.id)}
                      onBlur={() => handleRename(folder.id)}
                      autoFocus
                      suffix={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          按 Enter 保存
                        </Text>
                      }
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Radio
                      checked={selectedFolderId === folder.id}
                      onChange={() => setSelectedFolderId(folder.id)}
                    >
                      <Space>
                        {folder.isDefault && <StarFilled style={{ color: '#ff6b35', fontSize: 14 }} />}
                        <FolderOutlined style={{ fontSize: 16 }} />
                        <div>
                          <div>{folder.name}</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {folder._count.favorites} 个收藏
                          </Text>
                        </div>
                      </Space>
                    </Radio>
                    <Space size="small">
                      {!folder.isDefault ? (
                        <Button
                          type="text"
                          size="small"
                          icon={<StarFilled />}
                          onClick={e => { e.stopPropagation(); void handleSetDefault(folder.id); }}
                          title="设为默认"
                        />
                      ) : (
                        <Button
                          type="text"
                          size="small"
                          onClick={e => { e.stopPropagation(); void handleCancelDefault(); }}
                          title="取消默认"
                        >
                          默认
                        </Button>
                      )}
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={e => { e.stopPropagation(); setEditingId(folder.id); setEditingName(folder.name); }}
                        title="重命名"
                      />
                      <Popconfirm
                        title="删除此文件夹？文件夹内的收藏将移至根目录"
                        onConfirm={e => { e?.stopPropagation(); void handleDelete(folder.id); }}
                        okText="删除"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={e => e.stopPropagation()}
                          title="删除"
                        />
                      </Popconfirm>
                    </Space>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
