import { useState } from 'react';
import { Button, Space, Collapse, Divider, Tag, Typography, TreeSelect, type TreeSelectProps } from 'antd';
import { EnvironmentOutlined, FireOutlined, DownOutlined, FilterOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface MobileFilterBarProps {
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  filteredCount: number;
  locationData: TreeSelectProps['treeData'];
}

export default function MobileFilterBar({
  selectedLocation,
  onLocationChange,
  filteredCount,
  locationData,
}: MobileFilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const isSmallScreen = window.innerWidth < 576;

  if (isSmallScreen) {
    return (
      <div className="filter-bar-mobile card-trendy">
        <Button
          block
          icon={<FilterOutlined />}
          onClick={() => setExpanded(!expanded)}
          style={{
            borderRadius: 12,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            <FilterOutlined />
            <Text>筛选条件</Text>
            {selectedLocation && (
              <Tag color="orange" style={{ margin: 0 }}>
                {selectedLocation.split('-').pop()}
              </Tag>
            )}
          </Space>
          <DownOutlined rotate={expanded ? 180 : 0} />
        </Button>

        <Collapse
          ghost
          activeKey={expanded ? '1' : undefined}
          onChange={(keys) => setExpanded(keys.includes('1' as never))}
          style={{ marginTop: 12 }}
          items={[
            {
              key: '1',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <EnvironmentOutlined /> 地区筛选
                    </Text>
                    <TreeSelect
                      value={selectedLocation}
                      onChange={onLocationChange}
                      treeData={locationData}
                      placeholder="选择地区"
                      style={{ width: '100%', marginTop: 8 }}
                      allowClear
                      showSearch
                      treeDefaultExpandAll={false}
                      dropdownStyle={{ minWidth: '100%' }}
                    />
                  </div>

                  <Divider style={{ margin: '8px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space size={4}>
                      <FireOutlined style={{ color: '#ff6b35' }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        找到
                      </Text>
                      <Text strong style={{ fontSize: 16, color: '#ff6b35' }}>
                        {filteredCount}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        条动态
                      </Text>
                    </Space>
                  </div>
                </Space>
              ),
            },
          ]}
        />
      </div>
    );
  }

  // 桌面端保持原有布局
  return (
    <div className="filter-bar card-trendy">
      <Space size={14} wrap>
        <div className="filter-label">
          <EnvironmentOutlined />
          <Text strong>地区</Text>
        </div>

        <TreeSelect
          value={selectedLocation}
          onChange={onLocationChange}
          treeData={locationData}
          placeholder="选择地区发现美食"
          style={{ width: 200 }}
          size="large"
          allowClear
          showSearch
          treeDefaultExpandAll={false}
          dropdownStyle={{ minWidth: 220 }}
        />

        {selectedLocation && (
          <Tag
            closable
            onClose={() => onLocationChange('')}
            className="location-tag"
          >
            📍 {selectedLocation.split('-').pop()}
          </Tag>
        )}

        <Divider type="vertical" style={{ margin: 0, height: 24 }} />

        <div className="stats-badge">
          <FireOutlined />
          <Text strong>{filteredCount}</Text>
          <Text type="secondary">条动态</Text>
        </div>
      </Space>
    </div>
  );
}
