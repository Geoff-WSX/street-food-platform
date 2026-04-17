import { useState } from 'react';
import { Button, Card, Space, Typography, Switch } from 'antd';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import ThemeTransition from '../components/ThemeTransition';
import { useThemeStore } from '../store/theme';

const { Title, Paragraph, Text } = Typography;

export default function ThemeTestPage() {
  const {
    mode,
    isAnimating,
    pendingTheme,
    toggleTheme,
    setTheme,
    onAnimationComplete
  } = useThemeStore();

  const [testCount, setTestCount] = useState(0);

  const handleToggle = () => {
    setTestCount(prev => prev + 1);
    toggleTheme();
  };

  const handleSetDark = () => {
    setTestCount(prev => prev + 1);
    setTheme('dark');
  };

  const handleSetLight = () => {
    setTestCount(prev => prev + 1);
    setTheme('light');
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      {/* 主题过渡动画 */}
      {isAnimating && pendingTheme && (
        <ThemeTransition
          isDark={pendingTheme === 'dark'}
          onAnimationComplete={onAnimationComplete}
        />
      )}

      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={2}>主题切换动画测试</Title>
            <Paragraph>
              测试优化后的日夜模式切换动画效果
            </Paragraph>
          </div>

          <div>
            <Text strong>当前主题: </Text>
            <Text>{mode === 'dark' ? '🌙 夜间模式' : '☀️ 日间模式'}</Text>
          </div>

          <div>
            <Text strong>测试次数: </Text>
            <Text>{testCount}</Text>
          </div>

          <div>
            <Text strong>动画状态: </Text>
            <Text type={isAnimating ? 'warning' : 'success'}>
              {isAnimating ? '动画中...' : '空闲'}
            </Text>
            {pendingTheme && (
              <Text> → 切换到 {pendingTheme === 'dark' ? '夜间' : '日间'}模式</Text>
            )}
          </div>

          <Space wrap>
            <Button
              type="primary"
              icon={mode === 'light' ? <MoonOutlined /> : <SunOutlined />}
              onClick={handleToggle}
              disabled={isAnimating}
              size="large"
            >
              切换主题
            </Button>

            <Button
              icon={<MoonOutlined />}
              onClick={handleSetDark}
              disabled={isAnimating || mode === 'dark'}
            >
              切换到夜间模式
            </Button>

            <Button
              icon={<SunOutlined />}
              onClick={handleSetLight}
              disabled={isAnimating || mode === 'light'}
            >
              切换到日间模式
            </Button>
          </Space>
        </Space>
      </Card>

      <Card title="测试说明" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="small">
          <Paragraph>
            <Text strong>优化效果：</Text>
          </Paragraph>
          <ul>
            <li>现代圆形波纹扩散动画 (0.8秒)</li>
            <li>从屏幕中心向外扩散的优雅过渡</li>
            <li>深色模式: 深蓝紫色渐变 + 光晕效果</li>
            <li>浅色模式: 白色柔和渐变 + 光晕效果</li>
            <li>GPU 加速确保流畅性 (60fps)</li>
            <li>支持减少动画偏好设置</li>
          </ul>
          <Paragraph>
            <Text strong>测试要点：</Text>
          </Paragraph>
          <ul>
            <li>圆形扩展的流畅性 (60fps)</li>
            <li>主题切换时机的准确性</li>
            <li>光晕效果的视觉体验</li>
            <li>动画期间页面可交互性</li>
            <li>快速连续切换的稳定性</li>
          </ul>
        </Space>
      </Card>

      <Card title="测试内容区域">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Paragraph>
            这是一些示例内容，用于测试主题切换时的视觉效果。
            圆形波纹动画应该从屏幕中心向外扩散，提供流畅的过渡体验。
          </Paragraph>

          <div style={{
            padding: '16px',
            background: mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
            borderRadius: '8px'
          }}>
            <Text>主题色测试区域</Text>
          </div>

          <Space>
            <Switch checked={mode === 'dark'} onChange={handleToggle} disabled={isAnimating} />
            <Text>使用开关切换主题</Text>
          </Space>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '16px'
          }}>
            {[1, 2, 3, 4].map(i => (
              <Card key={i} size="small">
                <Text>测试卡片 {i}</Text>
              </Card>
            ))}
          </div>
        </Space>
      </Card>
    </div>
  );
}
