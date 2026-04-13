import React from 'react';
import { Card, Space, Typography, Button, Divider, Alert } from 'antd';
import {
  SunOutlined,
  MoonOutlined,
  BulbOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useTheme } from '../hooks/useTheme';
import { useThemeColors } from '../hooks/useTheme';
import ThemeSwitcher from './ThemeSwitcher';
import ThemeSettings from './ThemeSettings';

const { Title, Paragraph, Text } = Typography;

/**
 * 主题使用示例组件
 * 展示如何使用主题系统的各种功能
 */
export const ThemeExamples: React.FC = () => {
  const { mode, isDark, isLight, toggleWithAnimation, toggleTheme } = useTheme();
  const themeColors = useThemeColors();

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 标题 */}
        <div>
          <Title level={2}>
            <Space>
              <BulbOutlined />
              主题系统示例
            </Space>
          </Title>
          <Paragraph>
            当前主题: <Text strong>{isLight ? '日间模式' : '夜间模式'}</Text>
          </Paragraph>
        </div>

        <Divider />

        {/* 基础主题切换器 */}
        <Card title="基础主题切换器">
          <Space>
            <Text>点击按钮切换主题:</Text>
            <ThemeSwitcher size="middle" />
            <Button
              icon={isLight ? <MoonOutlined /> : <SunOutlined />}
              onClick={toggleWithAnimation}
            >
              带动画切换
            </Button>
            <Button
              onClick={toggleTheme}
            >
              普通切换
            </Button>
          </Space>
        </Card>

        {/* 主题状态 */}
        <Card title="主题状态">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>当前模式: <Text code>{mode}</Text></Text>
            <Text>是否暗色: <Text code>{isDark ? '是' : '否'}</Text></Text>
            <Text>是否亮色: <Text code>{isLight ? '是' : '否'}</Text></Text>
          </Space>
        </Card>

        {/* 主题颜色 */}
        <Card title="主题颜色">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <Text>主色:</Text>
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    background: themeColors.primary,
                    borderRadius: '8px',
                    marginTop: '8px',
                  }}
                />
                <Text code>{themeColors.primary}</Text>
              </div>
              <div>
                <Text>成功色:</Text>
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    background: themeColors.success,
                    borderRadius: '8px',
                    marginTop: '8px',
                  }}
                />
                <Text code>{themeColors.success}</Text>
              </div>
              <div>
                <Text>警告色:</Text>
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    background: themeColors.warning,
                    borderRadius: '8px',
                    marginTop: '8px',
                  }}
                />
                <Text code>{themeColors.warning}</Text>
              </div>
              <div>
                <Text>错误色:</Text>
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    background: themeColors.error,
                    borderRadius: '8px',
                    marginTop: '8px',
                  }}
                />
                <Text code>{themeColors.error}</Text>
              </div>
            </div>
          </Space>
        </Card>

        {/* 背景和文字颜色 */}
        <Card title="背景和文字颜色">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div
              style={{
                padding: '16px',
                background: themeColors.bgPrimary,
                borderRadius: '8px',
                border: `1px solid ${themeColors.borderColor}`,
              }}
            >
              <Text style={{ color: themeColors.textPrimary }}>
                主要背景 - 主要文字
              </Text>
            </div>
            <div
              style={{
                padding: '16px',
                background: themeColors.bgSecondary,
                borderRadius: '8px',
                border: `1px solid ${themeColors.borderColor}`,
              }}
            >
              <Text style={{ color: themeColors.textSecondary }}>
                次要背景 - 次要文字
              </Text>
            </div>
            <div
              style={{
                padding: '16px',
                background: themeColors.bgTertiary,
                borderRadius: '8px',
                border: `1px solid ${themeColors.borderColor}`,
              }}
            >
              <Text style={{ color: themeColors.textTertiary }}>
                第三背景 - 第三文字
              </Text>
            </div>
          </Space>
        </Card>

        {/* 主题设置面板 */}
        <Card title="主题设置面板">
          <ThemeSettings />
        </Card>

        {/* 无障碍提示 */}
        <Alert
          message="无障碍支持"
          description="本主题系统完全支持高对比度模式、字体缩放和减少动画等无障碍功能。您可以在主题设置面板中调整这些选项。"
          type="info"
          showIcon
          icon={<EyeOutlined />}
        />

        {/* 快捷键提示 */}
        <Alert
          message="快捷键"
          description="使用 Cmd/Ctrl + Shift + T 快速切换主题"
          type="info"
          showIcon
        />

        {/* 技术说明 */}
        <Card title="技术说明" type="inner">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Paragraph>
              <Text strong>主题状态管理:</Text> 使用 Zustand 进行状态管理，支持持久化存储
            </Paragraph>
            <Paragraph>
              <Text strong>CSS 变量:</Text> 使用 CSS 自定义属性实现主题切换，性能优异
            </Paragraph>
            <Paragraph>
              <Text strong>过渡动画:</Text> 平滑的主题切换动画，避免视觉突变
            </Paragraph>
            <Paragraph>
              <Text strong>无障碍支持:</Text> 完整的无障碍功能，包括高对比度、字体缩放等
            </Paragraph>
            <Paragraph>
              <Text strong>性能优化:</Text> 使用 requestAnimationFrame 和防抖技术优化性能
            </Paragraph>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default ThemeExamples;
