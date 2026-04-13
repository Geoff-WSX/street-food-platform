import React from 'react';
import { Card, Switch, Radio, Space, Typography, Divider, Alert } from 'antd';
import {
  SunOutlined,
  MoonOutlined,
  EyeOutlined,
  FontSizeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useThemeStore } from '../store/theme';

const { Title, Text } = Typography;

interface ThemeSettingsProps {
  style?: React.CSSProperties;
  className?: string;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({ style, className }) => {
  const {
    mode,
    contrast,
    fontScale,
    reduceMotion,
    setTheme,
    setContrast,
    setFontScale,
    setReduceMotion,
  } = useThemeStore();

  return (
    <Card
      title={
        <Space>
          <SunOutlined />
          <span>主题设置</span>
        </Space>
      }
      style={style}
      className={className}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 主题模式选择 */}
        <div>
          <Title level={5}>
            <Space>
              {mode === 'light' ? <SunOutlined /> : <MoonOutlined />}
              主题模式
            </Space>
          </Title>
          <Radio.Group
            value={mode}
            onChange={(e) => setTheme(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio.Button value="light" style={{ width: '100%', textAlign: 'left' }}>
                <Space>
                  <SunOutlined />
                  <Text>日间模式</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    - 适合白天使用
                  </Text>
                </Space>
              </Radio.Button>
              <Radio.Button value="dark" style={{ width: '100%', textAlign: 'left' }}>
                <Space>
                  <MoonOutlined />
                  <Text>夜间模式</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    - 适合夜晚使用，保护眼睛
                  </Text>
                </Space>
              </Radio.Button>
            </Space>
          </Radio.Group>
        </div>

        <Divider />

        {/* 对比度设置 */}
        <div>
          <Title level={5}>
            <Space>
              <EyeOutlined />
              对比度
            </Space>
          </Title>
          <Radio.Group
            value={contrast}
            onChange={(e) => setContrast(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio.Button value="normal" style={{ width: '100%', textAlign: 'left' }}>
                <Space>
                  <Text>标准对比度</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    - 默认设置
                  </Text>
                </Space>
              </Radio.Button>
              <Radio.Button value="high" style={{ width: '100%', textAlign: 'left' }}>
                <Space>
                  <Text>高对比度</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    - 增强视觉可访问性
                  </Text>
                </Space>
              </Radio.Button>
            </Space>
          </Radio.Group>
        </div>

        <Divider />

        {/* 字体大小设置 */}
        <div>
          <Title level={5}>
            <Space>
              <FontSizeOutlined />
              字体大小
            </Space>
          </Title>
          <Radio.Group
            value={fontScale}
            onChange={(e) => setFontScale(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio.Button value="small" style={{ width: '100%', textAlign: 'left' }}>
                <Space>
                  <Text style={{ fontSize: 12 }}>小字体</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    - 14px
                  </Text>
                </Space>
              </Radio.Button>
              <Radio.Button value="medium" style={{ width: '100%', textAlign: 'left' }}>
                <Space>
                  <Text style={{ fontSize: 14 }}>中字体</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    - 16px (推荐)
                  </Text>
                </Space>
              </Radio.Button>
              <Radio.Button value="large" style={{ width: '100%', textAlign: 'left' }}>
                <Space>
                  <Text style={{ fontSize: 16 }}>大字体</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    - 18px
                  </Text>
                </Space>
              </Radio.Button>
            </Space>
          </Radio.Group>
        </div>

        <Divider />

        {/* 动画设置 */}
        <div>
          <Title level={5}>
            <Space>
              <ThunderboltOutlined />
              动画效果
            </Space>
          </Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Text>减少动画效果</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  - 关闭过渡动画
                </Text>
              </Space>
              <Switch
                checked={reduceMotion}
                onChange={setReduceMotion}
                checkedChildren="开启"
                unCheckedChildren="关闭"
              />
            </div>
            {reduceMotion && (
              <Alert
                message="已开启减少动画模式"
                description="页面过渡和动画效果将被最小化，以提高性能并减少视觉干扰。"
                type="info"
                showIcon
                style={{ marginTop: 8 }}
              />
            )}
          </Space>
        </div>

        <Divider />

        {/* 预览区域 */}
        <div>
          <Title level={5}>预览</Title>
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong style={{ color: 'var(--text-primary)' }}>
                这是示例文字
              </Text>
              <Text style={{ color: 'var(--text-secondary)' }}>
                当前主题: {mode === 'light' ? '日间模式' : '夜间模式'}
              </Text>
              <Text style={{ color: 'var(--text-tertiary)' }}>
                字体大小: {fontScale === 'small' ? '14px' : fontScale === 'medium' ? '16px' : '18px'}
              </Text>
              <div
                style={{
                  padding: 8,
                  background: 'var(--color-primary-bg)',
                  borderRadius: 4,
                  color: 'var(--color-primary)',
                  textAlign: 'center',
                  marginTop: 8,
                }}
              >
                主要颜色示例
              </div>
            </Space>
          </div>
        </div>
      </Space>
    </Card>
  );
};

export default ThemeSettings;
