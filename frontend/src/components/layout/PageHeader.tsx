import { Typography } from 'antd';
import { getAnimationStyle } from '../../utils/foodAnimations';

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  decorations?: string[];
  gradient?: boolean;
  centered?: boolean;
  size?: 'default' | 'large';
}

export function PageHeader({
  title,
  subtitle,
  decorations,
  gradient = true,
  centered = true,
  size = 'default',
}: PageHeaderProps) {
  const titleFontSize = size === 'large' ? { mobile: 24, desktop: 32 } : { mobile: 20, desktop: 28 };

  return (
    <div
      className="page-hero"
      style={{
        marginBottom: 18,
        textAlign: centered ? 'center' : 'left',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Food decorations */}
      {decorations && decorations.length > 0 && (
        <div
          className="page-hero-decorations"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: centered ? 'center' : 'flex-start',
            gap: 12,
            marginBottom: 10,
          }}
        >
          {decorations.map((food, i) => (
            <span
              key={i}
              style={{
                fontSize: 24,
                display: 'inline-block',
                filter: 'drop-shadow(0 2px 4px rgba(255, 107, 53, 0.3))',
                ...getAnimationStyle('float', 4 + i * 0.5, i * 0.2),
              }}
            >
              {food}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <Title
        level={2}
        style={{
          margin: 0,
          fontSize: titleFontSize.mobile,
          fontWeight: 800,
        }}
        className="page-hero-title"
      >
        {gradient ? (
          <span
            style={{
              background: 'linear-gradient(135deg, #ff6b35 0%, #ff8e53 50%, #ffb347 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            🔥 {title}
          </span>
        ) : (
          `🔥 ${title}`
        )}
      </Title>

      {/* Subtitle */}
      {subtitle && (
        <Text
          type="secondary"
          style={{
            fontSize: 14,
            color: '#8c8c8c',
            display: 'block',
            marginTop: 4,
          }}
        >
          ✨ {subtitle}
        </Text>
      )}

      <style>{`
        @media (min-width: 768px) {
          .page-hero-title {
            font-size: ${titleFontSize.desktop}px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default PageHeader;