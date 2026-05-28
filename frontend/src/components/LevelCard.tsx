import { memo, useState, useEffect } from 'react';
import { Card, Progress, List, Tag, Space, Typography, Spin, Empty, Modal, Button } from 'antd';
import { CheckCircleFilled, ClockCircleOutlined, TrophyOutlined, CrownOutlined, FireOutlined, FileTextOutlined, LikeOutlined, StarOutlined, UserAddOutlined, CommentOutlined } from '@ant-design/icons';
import type { UserLevelInfo, Level } from '../api/level';
import { getMyLevelInfo, getAllLevels } from '../api/level';

const { Title, Text } = Typography;

// 任务图标映射
const TASK_ICONS: Record<string, React.ReactNode> = {
  daily_login: <CheckCircleFilled style={{ color: '#52c41a' }} />,
  post_count: <FileTextOutlined style={{ color: '#1890ff' }} />,
  received_likes: <LikeOutlined style={{ color: '#ff6b35' }} />,
  received_favorites: <StarOutlined style={{ color: '#fa8c16' }} />,
  comment_count: <CommentOutlined style={{ color: '#722ed1' }} />,
  following_count: <UserAddOutlined style={{ color: '#13c2c2' }} />,
  default: <FireOutlined style={{ color: '#ff6b35' }} />,
};

const getTaskIcon = (taskKey: string) => TASK_ICONS[taskKey] || TASK_ICONS.default;

// 等级颜色映射
const LEVEL_COLORS: Record<number, string> = {
  1: '#8c8c8c',
  2: '#52c41a',
  3: '#1890ff',
  4: '#722ed1',
  5: '#fa8c16',
  6: '#f5222d',
};

// 等级图标映射
const LEVEL_ICONS: Record<number, string> = {
  1: '🌱',
  2: '🍀',
  3: '🌸',
  4: '⭐',
  5: '🔥',
  6: '👑',
};

// 等级特权映射
const LEVEL_PRIVILEGES: Record<number, string[]> = {
  1: ['基本发帖功能', '点赞和收藏', '关注其他用户'],
  2: ['评论功能', '发送私信', '参与话题讨论'],
  3: ['创建收藏夹', '推荐美食', '加入美食之旅'],
  4: ['发布短视频', '创建话题', '成为认证美食达人'],
  5: ['专属标识', '优先推荐', '线下活动邀请'],
  6: ['专属客服', '新功能内测', '年度美食盛典邀请'],
};

interface LevelCardProps {
  visible: boolean;
  onClose: () => void;
}

export const LevelCard = memo<LevelCardProps>(({ visible, onClose }) => {
  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);
  const [allLevels, setAllLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'levels'>('tasks');

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [levelRes, allLevelsRes] = await Promise.all([
        getMyLevelInfo(),
        getAllLevels(),
      ]);
      setLevelInfo(levelRes);
      setAllLevels(allLevelsRes);
    } catch (error) {
      console.error('获取等级信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const levelColor = levelInfo ? LEVEL_COLORS[levelInfo.currentLevel.level] || '#8c8c8c' : '#8c8c8c';
  const levelIcon = levelInfo ? LEVEL_ICONS[levelInfo.currentLevel.level] || '🌱' : '🌱';

  // 计算进度
  const expToNextLevel = levelInfo?.expToNextLevel ?? 0;
  const currentExpInLevel = levelInfo ? levelInfo.exp - levelInfo.currentLevel.minExp : 0;
  const progressPercent = expToNextLevel > 0
    ? Math.min(Math.round((currentExpInLevel / expToNextLevel) * 100), 100)
    : 100;

  // 分离已完成和未完成的任务
  const completedTasks = levelInfo?.progress.filter(p => p.completed) || [];
  const pendingTasks = levelInfo?.progress.filter(p => !p.completed) || [];

  // 渲染所有等级
  const renderAllLevels = () => (
    <div style={{ maxHeight: 400, overflow: 'auto' }}>
      {allLevels.map((lvl) => {
        const lvlColor = LEVEL_COLORS[lvl.level] || '#8c8c8c';
        const lvlIcon = LEVEL_ICONS[lvl.level] || '🌱';
        const isCurrentLevel = levelInfo?.currentLevel.level === lvl.level;
        const isUnlocked = lvl.level <= (levelInfo?.currentLevel.level ?? 0);
        const privileges = LEVEL_PRIVILEGES[lvl.level] || [];

        return (
          <Card
            key={lvl.level}
            size="small"
            style={{
              marginBottom: 12,
              borderColor: isCurrentLevel ? lvlColor : undefined,
              opacity: isUnlocked ? 1 : 0.7,
            }}
            bodyStyle={{ padding: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${lvlColor}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  flexShrink: 0,
                }}
              >
                {lvlIcon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 14 }}>
                    Lv{lvl.level} {lvl.name}
                  </Text>
                  {isCurrentLevel && <Tag color={lvlColor} style={{ fontSize: 10 }}>当前</Tag>}
                  {isUnlocked && <CheckCircleFilled style={{ color: '#52c41a', fontSize: 12 }} />}
                </div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                  {lvl.minExp} - {lvl.maxExp ?? '∞'} 经验值 | {lvl.description}
                </Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {privileges.map((priv, idx) => (
                    <Tag
                      key={idx}
                      color={isCurrentLevel ? lvlColor : 'default'}
                      style={{ fontSize: 10, marginRight: 0 }}
                    >
                      {isUnlocked ? '✓' : '🔒'} {priv}
                    </Tag>
                  ))}
                </div>
                {lvl.level > (levelInfo?.currentLevel.level ?? 0) && (
                  <div style={{ marginTop: 8 }}>
                    <Progress
                      percent={Math.round((levelInfo?.exp ?? 0) / lvl.minExp * 100)}
                      size="small"
                      strokeColor={lvlColor}
                      format={(percent) => `${percent}%`}
                    />
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      距离 Lv{lvl.level} 还需 {lvl.minExp - (levelInfo?.exp ?? 0)} 经验
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );

  return (
    <Modal
      title={
        <Space>
          <span style={{ fontSize: 20 }}>{levelIcon}</span>
          <span>等级详情</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={520}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">加载中...</Text>
          </div>
        </div>
      ) : !levelInfo ? (
        <Empty description="加载等级信息失败" style={{ padding: 40 }} />
      ) : (
        <div style={{ padding: '8px 0' }}>
          {/* Tab 切换 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Button
              type={activeTab === 'tasks' ? 'primary' : 'default'}
              icon={<TrophyOutlined />}
              onClick={() => setActiveTab('tasks')}
              style={{ flex: 1 }}
            >
              我的任务
            </Button>
            <Button
              type={activeTab === 'levels' ? 'primary' : 'default'}
              icon={<CrownOutlined />}
              onClick={() => setActiveTab('levels')}
              style={{ flex: 1 }}
            >
              等级特权
            </Button>
          </div>

          {activeTab === 'tasks' ? (
            <>
              {/* 等级信息头部 */}
              <Card
                style={{
                  background: `linear-gradient(135deg, ${levelColor}15 0%, ${levelColor}05 100%)`,
                  border: `1px solid ${levelColor}30`,
                  marginBottom: 16,
                }}
                bodyStyle={{ padding: 20 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  {/* 圆形进度环 */}
                  <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                    <Progress
                      type="circle"
                      percent={progressPercent}
                      size={80}
                      strokeColor={levelColor}
                      strokeWidth={8}
                      format={() => (
                        <span style={{ fontSize: 24 }}>{levelIcon}</span>
                      )}
                    />
                  </div>

                  {/* 等级信息 */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Title level={4} style={{ margin: 0, color: levelColor }}>
                        Lv{levelInfo.currentLevel.level} {levelInfo.currentLevel.name}
                      </Title>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary">当前经验值: </Text>
                      <Text strong>{levelInfo.exp}</Text>
                    </div>
                    {levelInfo.expToNextLevel !== null ? (
                      <div>
                        <Text type="secondary">距离升级: </Text>
                        <Text strong style={{ color: levelColor }}>
                          还需 {levelInfo.expToNextLevel} 经验
                        </Text>
                      </div>
                    ) : (
                      <Tag color={levelColor} style={{ marginTop: 4 }}>
                        最高等级
                      </Tag>
                    )}
                  </div>
                </div>
              </Card>

              {/* 经验值进度条 */}
              {levelInfo.expToNextLevel !== null && (
                <Card size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {levelInfo.currentLevel.minExp} EXP
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {levelInfo.currentLevel.maxExp ?? '∞'} EXP
                    </Text>
                  </div>
                  <Progress
                    percent={progressPercent}
                    strokeColor={levelColor}
                    showInfo={false}
                    trailColor="#f0f0f0"
                  />
                  <div style={{ textAlign: 'center', marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {currentExpInLevel} / {expToNextLevel} 经验值
                    </Text>
                  </div>
                </Card>
              )}

              {/* 升级奖励提示 */}
              {levelInfo.expToNextLevel !== null && (
                <Card
                  size="small"
                  style={{
                    marginBottom: 16,
                    background: 'linear-gradient(135deg, #fffbe6 0%, #fff7cc 100%)',
                    border: '1px solid #ffe58f',
                  }}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🎁</span>
                    <Text style={{ fontSize: 13 }}>
                      升级到 <Text strong>Lv{levelInfo.currentLevel.level + 1}</Text> 可获得新特权！
                    </Text>
                  </div>
                </Card>
              )}

              {/* 任务列表 */}
              <Title level={5} style={{ marginBottom: 12 }}>
                等级任务
              </Title>

              {/* 未完成任务 */}
              {pendingTasks.length > 0 && (
                <>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    进行中 ({pendingTasks.length})
                  </Text>
                  <List
                    size="small"
                    dataSource={pendingTasks}
                    renderItem={(task) => {
                      const taskProgress = Math.round((task.currentCount / task.targetCount) * 100);
                      const isDailyTask = task.taskKey.startsWith('daily_');
                      return (
                        <List.Item
                          style={{
                            padding: '12px 0',
                            borderBottom: '1px solid #f5f5f5',
                          }}
                        >
                          <List.Item.Meta
                            avatar={
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 10,
                                  background: `${levelColor}15`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 18,
                                  border: `2px solid ${levelColor}30`,
                                }}
                              >
                                {getTaskIcon(task.taskKey)}
                              </div>
                            }
                            title={
                              <Space size={8} style={{ width: '100%', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 14, fontWeight: 500 }}>{task.taskName}</Text>
                                <Tag color={isDailyTask ? 'orange' : 'blue'} style={{ fontSize: 11, marginRight: 0 }}>
                                  +{task.expReward} EXP
                                </Tag>
                              </Space>
                            }
                            description={
                              <>
                                {task.description && (
                                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                                    {task.description}
                                  </Text>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Progress
                                    percent={taskProgress}
                                    size="small"
                                    strokeColor={levelColor}
                                    trailColor="#f0f0f0"
                                    format={() => `${task.currentCount}/${task.targetCount}`}
                                    style={{ flex: 1, marginBottom: 0 }}
                                  />
                                </div>
                                {isDailyTask && (
                                  <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4 }}>
                                    <ClockCircleOutlined /> 每日重置
                                  </Text>
                                )}
                              </>
                            }
                          />
                        </List.Item>
                      );
                    }}
                    style={{ marginBottom: 16 }}
                  />
                </>
              )}

              {/* 已完成任务 */}
              {completedTasks.length > 0 && (
                <>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    已完成 ({completedTasks.length})
                  </Text>
                  <List
                    size="small"
                    dataSource={completedTasks}
                    renderItem={(task) => {
                      const isDailyTask = task.taskKey.startsWith('daily_');
                      return (
                        <List.Item
                          style={{
                            padding: '10px 0',
                            borderBottom: '1px solid #f5f5f5',
                            opacity: 0.7,
                          }}
                        >
                          <List.Item.Meta
                            avatar={
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 10,
                                  background: '#52c41a15',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 18,
                                  border: '2px solid #52c41a30',
                                }}
                              >
                                {task.icon || <CheckCircleFilled style={{ color: '#52c41a' }} />}
                              </div>
                            }
                            title={
                              <Space size={8}>
                                <Text delete style={{ fontSize: 14, fontWeight: 500 }}>{task.taskName}</Text>
                                <CheckCircleFilled style={{ color: '#52c41a', fontSize: 12 }} />
                              </Space>
                            }
                            description={
                              <>
                                {task.description && (
                                  <Text type="secondary" delete style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                                    {task.description}
                                  </Text>
                                )}
                                <Text style={{ fontSize: 11, color: '#52c41a' }}>
                                  已获得 +{task.expReward} EXP
                                  {isDailyTask && ' · 明日可再次完成'}
                                </Text>
                              </>
                            }
                          />
                        </List.Item>
                      );
                    }}
                  />
                </>
              )}

              {levelInfo.progress.length === 0 && (
                <Empty description="暂无等级任务" style={{ padding: 24 }} />
              )}
            </>
          ) : (
            <>
              {/* 当前等级特权提示 */}
              <Card
                style={{
                  background: `linear-gradient(135deg, ${levelColor}15 0%, ${levelColor}05 100%)`,
                  border: `1px solid ${levelColor}30`,
                  marginBottom: 16,
                }}
                bodyStyle={{ padding: 16 }}
              >
                <Space>
                  <span style={{ fontSize: 20 }}>{levelIcon}</span>
                  <div>
                    <Text strong style={{ fontSize: 14 }}>
                      Lv{levelInfo.currentLevel.level} {levelInfo.currentLevel.name}
                    </Text>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        拥有 {LEVEL_PRIVILEGES[levelInfo.currentLevel.level]?.length || 0} 项特权
                      </Text>
                    </div>
                  </div>
                </Space>
              </Card>

              {/* 所有等级列表 */}
              {renderAllLevels()}
            </>
          )}
        </div>
      )}
    </Modal>
  );
});

LevelCard.displayName = 'LevelCard';

export default LevelCard;
