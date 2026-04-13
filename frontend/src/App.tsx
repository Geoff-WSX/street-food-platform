import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { App as AntdApp, Layout, ConfigProvider, Spin, theme } from 'antd';
import { lazy, Suspense, useEffect } from 'react';
import zhCN from 'antd/locale/zh_CN';
import { useState, useMemo } from 'react';
import Navbar from './components/Navbar';
import AuthGuard from './components/AuthGuard';
import FloatingAIButton from './components/FloatingAIButton';
import SearchModal from './components/SearchModal';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';
import PublishModal from './components/PublishModal';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import RankingPage from './pages/RankingPage';
import MessagesPage from './pages/MessagesPage';
import FriendsPage from './pages/FriendsPage';
import FriendRequestsPage from './pages/FriendRequestsPage';
import { useAuthStore } from './store/auth';
import { useThemeStore, applyTheme, applyAccessibilitySettings } from './store/theme';
import { getMe } from './api/user';
import { wsService, requestNotificationPermission } from './services/websocket';
import { useScreenSize } from './hooks/useScreenSize';
import './styles/designTokens.css';
import './styles/backgrounds.css';
import './styles/foodAnimations.css';
import './styles/foodTheme.css';
import './styles/urbanFoodie.css';
import './styles/urbanInteractions.css';
import './styles/postCardUrban.css';
import './styles/homePage.css';
import './styles/theme.css';
import './styles/themeEnhancements.css';
import './styles/themeFixes.css';

// 懒加载大型页面
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));

const { Content } = Layout;

function AppContent() {
  const location = useLocation();
  const screenSize = useScreenSize();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { mode, contrast, fontScale, reduceMotion } = useThemeStore();
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [handledPath, setHandledPath] = useState<string | null>(null);

  // 应用主题设置
  useEffect(() => {
    applyTheme(mode);
    applyAccessibilitySettings({ contrast, fontScale, reduceMotion });
  }, [mode, contrast, fontScale, reduceMotion]);

  // 每次应用加载时刷新用户数据，确保角色信息是最新的
  useEffect(() => {
    if (isLoggedIn) {
      getMe()
        .then((user) => {
          updateUser(user);
        })
        .catch(() => {
          // 忽略错误，用户可能已登出
        });

      // 连接 WebSocket
      const token = localStorage.getItem('sf_token');
      if (token) {
        wsService.connect(token);
      }

      // 请求通知权限
      requestNotificationPermission();
    } else {
      // 断开 WebSocket
      wsService.disconnect();
    }
  }, [isLoggedIn, updateUser]);

  // 从路径派生是否应该打开弹窗
  const shouldOpenFromPath = useMemo(() => {
    return location.pathname === '/publish' && isLoggedIn;
  }, [location.pathname, isLoggedIn]);

  // 监听路由变化，控制弹窗显示
  // 使用 setTimeout 避免在 effect 中同步调用 setState
  useEffect(() => {
    if (shouldOpenFromPath && location.pathname !== handledPath) {
      const timer = setTimeout(() => {
        setManualOpen(true);
        setHandledPath(location.pathname);
        // 替换历史记录，避免用户点击后退时再次打开弹窗
        window.history.replaceState({}, '', '/');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [shouldOpenFromPath, location.pathname, handledPath]);

  // 合并路由触发和手动触发的状态
  const isModalOpen = publishModalOpen || manualOpen;

  const handleClosePublishModal = () => {
    setPublishModalOpen(false);
    setManualOpen(false);
  };

  // 根据路由确定背景类名
  const getBackgroundClass = () => {
    switch (location.pathname) {
      case '/':
        return 'home-page-bg';
      case '/ranking':
        return 'ranking-page-bg';
      case '/profile':
        return 'profile-page-bg';
      case '/messages':
        return 'messages-page-bg';
      case '/ai':
        return 'ai-page-bg';
      case '/login':
        return 'login-page-bg';
      default:
        if (location.pathname.startsWith('/post/')) {
          return 'post-detail-bg';
        }
        return 'food-decorative-bg';
    }
  };

  return (
    <>
      <Layout style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }} className={getBackgroundClass()}>
        {location.pathname !== '/login' && (
        <Navbar
          onPublishClick={() => setPublishModalOpen(true)}
          onSearchClick={() => setSearchModalOpen(true)}
        />
      )}
        <Content style={{
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
          padding: location.pathname === '/login' ? '0' : `0 ${screenSize.isSmallMobile ? 12 : screenSize.isMobile ? 16 : 24}px`
        }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/post/:id" element={<PostDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/messages" element={<AuthGuard><MessagesPage /></AuthGuard>} />
            <Route
              path="/admin"
              element={
                <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}><Spin size="large" /></div>}>
                  <AuthGuard><AdminPage /></AuthGuard>
                </Suspense>
              }
            />
            <Route
              path="/reports"
              element={
                <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}><Spin size="large" /></div>}>
                  <AuthGuard><ReportsPage /></AuthGuard>
                </Suspense>
              }
            />
            <Route
              path="/ai"
              element={
                <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}><Spin size="large" /></div>}>
                  <AuthGuard><AIAssistantPage /></AuthGuard>
                </Suspense>
              }
            />
            <Route path="/friends" element={<AuthGuard><Navigate to={"/profile?tab=friends"} replace /></AuthGuard>} />
            <Route path="/friends/requests" element={<AuthGuard><FriendRequestsPage /></AuthGuard>} />
          </Routes>
        </Content>
      </Layout>

      {/* 悬浮 AI 助手按钮 */}
      <FloatingAIButton />

      {/* 发布动态弹窗 */}
      <PublishModal open={isModalOpen} onClose={handleClosePublishModal} />

      {/* 搜索弹窗 */}
      <SearchModal open={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </>
  );
}

export default function App() {
  const { mode } = useThemeStore();

  // 根据主题模式动态生成 Ant Design 主题配置
  const antdTheme = {
    token: {
      colorPrimary: '#ff6b35',
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#ff4d4f',
      colorInfo: '#1890ff',
      borderRadius: 12,
      fontSize: 14,
    },
    components: {
      Layout: {
        headerBg: mode === 'dark' ? '#141414' : '#ffffff',
        headerHeight: 70,
      },
    },
    algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
  };

  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>}>
      <ConfigProvider
        locale={zhCN}
        theme={antdTheme}
      >
        <AntdApp>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </Suspense>
  );
}
