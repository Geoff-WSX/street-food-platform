import { Layout, Menu, Button, Avatar, Space, Dropdown, Badge } from 'antd';
import { HomeOutlined, PlusOutlined, UserOutlined, LogoutOutlined, TrophyOutlined, CaretDownOutlined, MessageOutlined, PlayCircleOutlined, CrownOutlined, WarningOutlined, RobotOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useMessageStore } from '../store/message';
import { useEffect, useState } from 'react';
import { getUnreadCount } from '../api/message';
import type { MenuProps } from 'antd';

const { Header } = Layout;

interface Props {
  onPublishClick?: () => void;
}

export default function Navbar({ onPublishClick }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, logout } = useAuthStore();
  const { unreadCount, setUnreadCount } = useMessageStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      getUnreadCount().then(({ count }) => setUnreadCount(count)).catch(() => {});
      const interval = setInterval(() => {
        getUnreadCount().then(({ count }) => setUnreadCount(count)).catch(() => {});
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, setUnreadCount]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const selectedKey = location.pathname === '/' ? 'home'
    : location.pathname.startsWith('/ranking') ? 'ranking'
    : location.pathname.startsWith('/swipe') ? 'swipe'
    : '';

  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: '首页',
      onClick: () => navigate('/')
    },
    {
      key: 'swipe',
      icon: <PlayCircleOutlined />,
      label: '视频',
      onClick: () => navigate('/swipe')
    },
    {
      key: 'ranking',
      icon: <TrophyOutlined />,
      label: '美食榜',
      onClick: () => navigate('/ranking')
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '我的主页',
      onClick: () => navigate('/profile')
    },
    ...(user && (user.role === 'admin' || user.role === 'reviewer') ? [{
      key: 'reports',
      icon: <WarningOutlined />,
      label: user.role === 'admin' ? '举报管理' : '审核中心',
      onClick: () => navigate('/reports')
    }] : []),
    ...(user && (user.role === 'admin' || user.role === 'super_admin') ? [{
      key: 'admin',
      icon: <CrownOutlined />,
      label: '管理控制台',
      onClick: () => navigate('/admin')
    }] : []),
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    },
  ];

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        background: scrolled ? 'rgba(255, 255, 255, 0.95)' : '#fff',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 70,
        transition: 'all 0.3s ease',
        borderBottom: scrolled ? '1px solid rgba(102, 126, 234, 0.1)' : '1px solid #f0f0f0'
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginRight: 50,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          transition: 'transform 0.3s ease'
        }}
        onClick={() => navigate('/')}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{
          fontSize: 32,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3))'
        }}>🍜</span>
        <span style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: 22,
          fontWeight: 800
        }}>街边美食</span>
      </div>

      {/* 导航菜单 */}
      <Menu
        mode="horizontal"
        selectedKeys={[selectedKey]}
        style={{
          flex: 1,
          border: 'none',
          fontSize: 16,
          fontWeight: 500,
          background: 'transparent'
        }}
        items={menuItems.map(item => ({
          ...item,
          label: (
            <span style={{
              color: selectedKey === item.key ? '#667eea' : '#262626',
              position: 'relative',
              padding: '8px 16px',
              borderRadius: 8,
              transition: 'all 0.3s ease'
            }}>
              {item.label}
              {selectedKey === item.key && (
                <span style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '30px',
                  height: '3px',
                  background: 'linear-gradient(90deg, #667eea, #764ba2)',
                  borderRadius: '2px'
                }} />
              )}
            </span>
          )
        }))}
      />

      {/* 用户区域 */}
      <Space size={16}>
        {/* 发布按钮 */}
        {isLoggedIn && (
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={onPublishClick}
            style={{
              borderRadius: 24,
              height: 44,
              paddingLeft: 20,
              paddingRight: 20,
              fontWeight: 600,
              fontSize: 15,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
            }}
          >
            发布动态
          </Button>
        )}

        {/* 消息按钮 */}
        {isLoggedIn && (
          <Badge count={unreadCount} size="small" offset={[-4, 4]}>
            <Button
              icon={<MessageOutlined />}
              onClick={() => navigate('/messages')}
              style={{
                borderRadius: '50%',
                width: 44,
                height: 44,
                transition: 'all 0.3s ease',
                border: '1px solid #e8e8e8'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.color = '#667eea';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e8e8e8';
                e.currentTarget.style.color = undefined;
              }}
            />
          </Badge>
        )}

        {isLoggedIn ? (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 20, transition: 'all 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Avatar
                src={user?.avatar}
                icon={<UserOutlined />}
                size={40}
                style={{
                  border: '3px solid #f0f0f0',
                  transition: 'all 0.3s ease'
                }}
              />
              <span style={{ fontSize: 15, fontWeight: 500, color: '#262626', marginLeft: 8 }}>
                {user?.username}
              </span>
              <CaretDownOutlined style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 4 }} />
            </Space>
          </Dropdown>
        ) : (
          <Button
            type="primary"
            size="large"
            onClick={() => navigate('/login')}
            style={{
              borderRadius: 24,
              height: 44,
              paddingLeft: 24,
              paddingRight: 24,
              fontWeight: 600,
              fontSize: 15,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}
          >
            登录
          </Button>
        )}
      </Space>
    </Header>
  );
}
