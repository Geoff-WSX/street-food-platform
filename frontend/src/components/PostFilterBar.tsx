import { TreeSelect, Tag, Typography, Space, Divider } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface PostFilterBarProps {
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  locationTreeData: any[];
  variant?: 'home' | 'ranking';
  showStats?: boolean;
}

export default function PostFilterBar({
  selectedLocation,
  onLocationChange,
  locationTreeData,
  variant = 'home',
  showStats = true,
}: PostFilterBarProps) {
  const isHome = variant === 'home';
  const isRanking = variant === 'ranking';

  const locationLabelBg = isRanking
    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(255, 165, 0, 0.08) 100%)'
    : 'linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 179, 71, 0.05) 100%)';
  const locationLabelColor = isRanking ? '#D48806' : '#ff6b35';
  const locationTagBg = isRanking
    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(255, 165, 0, 0.08) 100%)'
    : 'linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 179, 71, 0.05) 100%)';
  const locationTagColor = isRanking ? '#D48806' : '#ff6b35';

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 10,
  };

  return (
    <div className={`filter-bar ${isHome ? 'card-trendy' : ''} stagger-fade-in delay-2`}
      style={isHome ? {} : {
        background: 'var(--card-bg)',
        borderRadius: 16,
        padding: '20px 24px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        border: '1px solid var(--border-color)',
        marginBottom: 24,
      }}
    >
      <Space size={isHome ? 10 : 12} wrap>
        {/* 地区 */}
        <div style={{ ...labelStyle, background: locationLabelBg }}>
          <EnvironmentOutlined style={{ color: locationLabelColor, fontSize: 14 }} />
          <Text strong style={{ fontSize: 13, color: locationLabelColor }}>地区</Text>
        </div>
        <TreeSelect
          value={selectedLocation}
          onChange={onLocationChange}
          treeData={locationTreeData}
          placeholder={isHome ? '选择地区发现美食' : '选择地区'}
          style={{ width: isHome ? 200 : 180 }}
          size="large"
          allowClear
          showSearch
          treeDefaultExpandAll={false}
          dropdownStyle={{ minWidth: 200 }}
        />
        {selectedLocation && (
          <Tag
            closable
            onClose={() => onLocationChange('')}
            style={{
              borderRadius: 12,
              padding: '4px 10px',
              fontSize: 12,
              background: locationTagBg,
              color: locationTagColor,
              border: `1px solid ${locationLabelColor}25`,
            }}
          >
            📍 {selectedLocation.split('-').pop()}
          </Tag>
        )}

        {showStats && (
          <>
            {(isHome || isRanking) && <Divider type="vertical" style={{ margin: 0, height: 24 }} />}
            <div className="stats-badge">
              <Text type="secondary">筛选动态</Text>
            </div>
          </>
        )}
      </Space>
    </div>
  );
}
