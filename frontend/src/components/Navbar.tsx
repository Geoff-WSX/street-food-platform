import { Layout, Menu, Button, Avatar, Space, Dropdown, Badge, Tooltip, Drawer, type MenuProps } from 'antd';
import { HomeOutlined, PlusOutlined, UserOutlined, LogoutOutlined, TrophyOutlined, CaretDownOutlined, MessageOutlined, CrownOutlined, WarningOutlined, SearchOutlined, StarOutlined, HistoryOutlined, MenuOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useMessageStore } from '../store/message';
import NotificationBell from './NotificationBell';
import ThemeSwitcher from './ThemeSwitcher';
import BrowseHistory from './BrowseHistory';
import { useEffect, useState } from 'react';
import { getUnreadCount } from '../api/message';
import { getAvatarUrl } from '../utils/images';

const { Header } = Layout;

interface Props {
  onPublishClick?: () => void;
  onSearchClick?: () => void;
}

export default function Navbar({ onPublishClick, onSearchClick }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, logout } = useAuthStore();
  const { unreadCount, setUnreadCount } = useMessageStore();
  const [scrolled, setScrolled] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    : '';

  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: '首页',
      onClick: () => navigate('/')
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
    {
      key: 'favorites',
      icon: <StarOutlined />,
      label: '我的收藏',
      onClick: () => navigate('/favorites')
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
    <>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: `0 clamp(8px, 3vw, 32px)`,
          background: 'var(--navbar-bg)',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          boxShadow: scrolled ? 'var(--shadow-1)' : 'none',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 'clamp(56px, 6vw, 70px)',
          maxHeight: '70px',
          transition: 'all 0.3s ease',
          borderBottom: '1px solid var(--navbar-border)'
        }}
        className={`navbar-container ${scrolled ? 'navbar-scrolled' : ''}`}
      >
        {/* Logo */}
        <div
          className="navbar-logo"
          style={{
            fontSize: 'clamp(16px, 2vw, 24px)',
            fontWeight: 700,
            marginRight: 'clamp(8px, 5vw, 50px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'transform 0.3s ease',
            flexShrink: 0
          }}
          onClick={() => navigate('/')}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span className="navbar-emoji" style={{
            fontSize: 'clamp(20px, 3vw, 32px)',
            background: 'linear-gradient(135deg, #ff6b35 0%, #ffb347 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 2px 4px rgba(255, 107, 53, 0.3))'
          }}>🍜</span>
          {!isMobile && (
            <span style={{
              background: 'linear-gradient(135deg, #ff6b35 0%, #ffb347 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: 'clamp(16px, 2vw, 22px)',
              fontWeight: 800,
              whiteSpace: 'nowrap'
            }}>食遇</span>
          )}
        </div>

        {/* 桌面端导航菜单 */}
        {!isMobile && (
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
                  color: selectedKey === item.key ? 'var(--color-primary)' : 'var(--text-primary)',
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
                      background: 'linear-gradient(90deg, #ff6b35, #ffb347)',
                      borderRadius: '2px'
                    }} />
                  )}
                </span>
              )
            }))}
          />
        )}

        {/* 用户区域 - 桌面端 */}
        {!isMobile && (
          <Space size={16} className="navbar-actions">
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
                  background: 'linear-gradient(135deg, #ff6b35 0%, #ffb347 100%)',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)';
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
                    e.currentTarget.style.borderColor = '#ff6b35';
                    e.currentTarget.style.color = '#ff6b35';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e8e8e8';
                    e.currentTarget.style.color = '';
                  }}
                />
              </Badge>
            )}

            {/* 通知铃铛 */}
            {isLoggedIn && <NotificationBell />}

            {/* 搜索按钮 */}
            <Tooltip title="搜索">
              <Button
                icon={<SearchOutlined />}
                onClick={onSearchClick}
                style={{
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  transition: 'all 0.3s ease',
                  border: '1px solid #e8e8e8'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#ff6b35';
                  e.currentTarget.style.color = '#ff6b35';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e8e8e8';
                  e.currentTarget.style.color = '';
                }}
              />
            </Tooltip>

            {/* 浏览历史按钮 */}
            <Tooltip title="浏览历史">
              <Button
                icon={<HistoryOutlined />}
                onClick={() => setHistoryVisible(true)}
                style={{
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  transition: 'all 0.3s ease',
                  border: '1px solid #e8e8e8'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#ff6b35';
                  e.currentTarget.style.color = '#ff6b35';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e8e8e8';
                  e.currentTarget.style.color = '';
                }}
              />
            </Tooltip>

            {/* 主题切换按钮 */}
            <ThemeSwitcher size="middle" />

            {isLoggedIn ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 20, transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 107, 53, 0.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <Avatar
                    src={getAvatarUrl(user)}
                    icon={<UserOutlined />}
                    size={40}
                    style={{
                      border: '3px solid #f0f0f0',
                      transition: 'all 0.3s ease'
                    }}
                  />
                  <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginLeft: 8 }}>
                    {user?.username}
                  </span>
                  <CaretDownOutlined style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 4 }} />
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
                  background: 'linear-gradient(135deg, #ff6b35 0%, #ffb347 100%)',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
                }}
              >
                登录
              </Button>
            )}
          </Space>
        )}

        {/* 移动端按钮区域 */}
        {isMobile && (
          <Space size={8} className="navbar-actions-mobile">
            {/* 搜索按钮 */}
            <Tooltip title="搜索">
              <Button
                icon={<SearchOutlined />}
                onClick={onSearchClick}
                style={{
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  border: '1px solid #e8e8e8'
                }}
              />
            </Tooltip>

            {/* 汉堡菜单按钮 */}
            <Button
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuVisible(true)}
              style={{
                borderRadius: '50%',
                width: 36,
                height: 36,
                border: '1px solid #e8e8e8'
              }}
            />
          </Space>
        )}

        {/* 浏览历史抽屉 */}
        <BrowseHistory visible={historyVisible} onClose={() => setHistoryVisible(false)} />
      </Header>

      {/* 移动端菜单抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: 'linear-gradient(135deg, #ff6b35 0%, #ffb347 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: 20,
              fontWeight: 800
            }}>食遇</span>
          </div>
        }
        placement="right"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        width={280}
        styles={{
          body: { padding: 0 }
        }}
        className="mobile-menu-drawer"
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* 用户信息区域 */}
          {isLoggedIn && (
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 179, 71, 0.05) 100%)',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar
                  src={getAvatarUrl(user)}
                  icon={<UserOutlined />}
                  size={48}
                  style={{ border: '3px solid #fff' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{user?.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>查看个人主页</div>
                </div>
              </div>
            </div>
          )}

          {/* 导航菜单 */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* 首页入口 */}
            <div
              onClick={() => { navigate('/'); setMobileMenuVisible(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border-color)',
                background: location.pathname === '/' ? 'rgba(255, 107, 53, 0.08)' : 'transparent'
              }}
            >
              <HomeOutlined style={{ fontSize: 18, color: location.pathname === '/' ? '#ff6b35' : 'var(--text-secondary)' }} />
              <span style={{ fontSize: 15, fontWeight: location.pathname === '/' ? 600 : 400 }}>首页</span>
            </div>

            {/* 美食榜入口 */}
            <div
              onClick={() => { navigate('/ranking'); setMobileMenuVisible(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border-color)',
                background: location.pathname.startsWith('/ranking') ? 'rgba(255, 107, 53, 0.08)' : 'transparent'
              }}
            >
              <TrophyOutlined style={{ fontSize: 18, color: location.pathname.startsWith('/ranking') ? '#ff6b35' : 'var(--text-secondary)' }} />
              <span style={{ fontSize: 15, fontWeight: location.pathname.startsWith('/ranking') ? 600 : 400 }}>美食榜</span>
            </div>

            {/* 发布动态入口 */}
            {isLoggedIn && (
              <div
                onClick={() => { onPublishClick?.(); setMobileMenuVisible(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <PlusOutlined style={{ fontSize: 18, color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: 15 }}>发布动态</span>
              </div>
            )}

            {/* 消息入口 */}
            {isLoggedIn && (
              <div
                onClick={() => { navigate('/messages'); setMobileMenuVisible(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <Badge count={unreadCount} size="small">
                  <MessageOutlined style={{ fontSize: 18, color: 'var(--text-secondary)' }} />
                </Badge>
                <span style={{ fontSize: 15 }}>消息</span>
              </div>
            )}

            {/* 个人设置 */}
            {isLoggedIn && (
              <>
                <div
                  onClick={() => { navigate('/profile'); setMobileMenuVisible(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-color)'
                  }}
                >
                  <UserOutlined style={{ fontSize: 18, color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: 15 }}>个人主页</span>
                </div>
                <div
                  onClick={() => { navigate('/favorites'); setMobileMenuVisible(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-color)'
                  }}
                >
                  <StarOutlined style={{ fontSize: 18, color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: 15 }}>我的收藏</span>
                </div>
              </>
            )}

            {/* 管理员入口 */}
            {user && (user.role === 'admin' || user.role === 'super_admin') && (
              <div
                onClick={() => { navigate('/admin'); setMobileMenuVisible(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <CrownOutlined style={{ fontSize: 18, color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: 15 }}>管理控制台</span>
              </div>
            )}

            {user && (user.role === 'admin' || user.role === 'reviewer') && (
              <div
                onClick={() => { navigate('/reports'); setMobileMenuVisible(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <WarningOutlined style={{ fontSize: 18, color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: 15 }}>{user.role === 'admin' ? '举报管理' : '审核中心'}</span>
              </div>
            )}
          </div>

          {/* 底部区域 */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
            {!isLoggedIn ? (
              <Button
                type="primary"
                block
                onClick={() => { navigate('/login'); setMobileMenuVisible(false); }}
                style={{
                  height: 44,
                  background: 'linear-gradient(135deg, #ff6b35 0%, #ffb347 100%)',
                  border: 'none',
                  borderRadius: 22
                }}
              >
                登录
              </Button>
            ) : (
              <Button
                danger
                block
                icon={<LogoutOutlined />}
                onClick={() => { handleLogout(); setMobileMenuVisible(false); }}
                style={{ height: 44, borderRadius: 22 }}
              >
                退出登录
              </Button>
            )}
          </div>
        </div>
      </Drawer>

      <style>{`
        /* Navbar 流体响应式样式 */
        .navbar-container {
          padding: 0 clamp(8px, 3vw, 32px) !important;
          height: clamp(56px, 6vw, 70px) !important;
          transition: all 0.3s ease;
        }

        .navbar-logo {
          margin-right: clamp(8px, 5vw, 50px) !important;
          font-size: clamp(16px, 2vw, 24px) !important;
        }

        .navbar-logo .navbar-emoji {
          font-size: clamp(20px, 3vw, 32px) !important;
        }

        .navbar-actions {
          gap: clamp(8px, 1.5vw, 16px) !important;
        }

        .navbar-actions-mobile {
          gap: clamp(4px, 1vw, 8px) !important;
        }

        .navbar-actions-mobile .ant-btn {
          width: clamp(32px, 4vw, 36px) !important;
          height: clamp(32px, 4vw, 36px) !important;
        }

        .mobile-menu-drawer .ant-drawer-body {
          padding: 0 !important;
        }

        /* 移动端菜单项 */
        @media (max-width: 768px) {
          .navbar-container {
            padding: 0 clamp(8px, 2vw, 12px) !important;
          }
        }

        /* 超小屏幕 */
        @media (max-width: 420px) {
          .navbar-logo .navbar-emoji {
            font-size: 20px !important;
          }

          .navbar-actions-mobile {
            gap: 2px !important;
          }
        }

        /* 大屏幕优化 */
        @media (min-width: 1400px) {
          .navbar-container {
            padding: 0 48px !important;
          }
        }
      `}</style>
    </>
  );
}
