import { TreeSelect, Tag, Typography, Space, Divider, AutoComplete } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TagItem {
  id: number;
  name: string;
  postCount: number;
}

interface PostFilterBarProps {
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  selectedTag: string;
  onTagChange: (value: string) => void;
  popularTags: TagItem[];
  locationTreeData: any[];
  variant?: 'home' | 'ranking';
  showStats?: boolean;
}

export default function PostFilterBar({
  selectedLocation,
  onLocationChange,
  selectedTag,
  onTagChange,
  popularTags,
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
  const tagLabelBg = 'linear-gradient(135deg, rgba(24, 144, 255, 0.12) 0%, rgba(24, 144, 255, 0.08) 100%)';

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

        {isHome && <Divider type="vertical" style={{ margin: 0, height: 24 }} />}

        {/* 话题 - 支持手动输入 */}
        <div style={{ ...labelStyle, background: tagLabelBg }}>
          <span style={{ fontSize: 14, color: '#1890ff', fontWeight: 600 }}>#</span>
          <Text strong style={{ fontSize: 13, color: '#1890ff' }}>话题</Text>
        </div>
        <AutoComplete
          value={selectedTag}
          onChange={(value) => onTagChange(value)}
          placeholder="输入话题搜索"
          style={{ width: isHome ? 140 : 160 }}
          size="large"
          allowClear
          options={popularTags.map(t => ({
            value: t.name,
            label: (
              <span>
                <span style={{ color: '#1890ff' }}>#</span>{t.name}
                <span style={{ color: '#8c8c8c', fontSize: 11, marginLeft: 6 }}>{t.postCount}篇</span>
              </span>
            ),
          }))}
          filterOption={(input, option) =>
            option ? option.value.toLowerCase().includes(input.toLowerCase()) : false
          }
        />
        {selectedTag && (
          <Tag
            closable
            onClose={() => onTagChange('')}
            style={{
              borderRadius: 12,
              padding: '4px 10px',
              fontSize: 12,
              background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(24, 144, 255, 0.05) 100%)',
              color: '#1890ff',
              border: '1px solid rgba(24, 144, 255, 0.2)',
            }}
          >
            #{selectedTag}
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
