import { Button } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

export default function FloatingAIButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // 在 AI 页面不显示悬浮按钮
  if (location.pathname === '/ai') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 24,
        zIndex: 1000,
      }}
    >
      <Button
        type="primary"
        icon={<RobotOutlined />}
        onClick={() => navigate('/ai', { state: { from: location.pathname } })}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          fontSize: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        }}
      />
    </div>
  );
}
