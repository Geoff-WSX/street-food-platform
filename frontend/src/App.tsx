import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { App as AntdApp, Layout, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useEffect, useState, useMemo } from 'react';
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
import SwipePage from './pages/SwipePage';
import AdminPage from './pages/AdminPage';
import ReportsPage from './pages/ReportsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import { useAuthStore } from './store/auth';
import { getMe } from './api/user';
import { wsService, requestNotificationPermission } from './services/websocket';
import './styles/backgrounds.css';

const { Content } = Layout;

function AppContent() {
  const location = useLocation();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [handledPath, setHandledPath] = useState<string | null>(null);

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
  useEffect(() => {
    if (shouldOpenFromPath && location.pathname !== handledPath) {
      setManualOpen(true);
      setHandledPath(location.pathname);
      // 替换历史记录，避免用户点击后退时再次打开弹窗
      window.history.replaceState({}, '', '/');
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
      case '/swipe':
        return 'swipe-page-bg';
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
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }} className={getBackgroundClass()}>
        {location.pathname !== '/login' && (
        <Navbar
          onPublishClick={() => setPublishModalOpen(true)}
          onSearchClick={() => setSearchModalOpen(true)}
        />
      )}
        <Content style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: location.pathname === '/login' ? '0' : '0 24px' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/swipe" element={<SwipePage />} />
            <Route path="/post/:id" element={<PostDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/messages" element={<AuthGuard><MessagesPage /></AuthGuard>} />
            <Route path="/admin" element={<AuthGuard><AdminPage /></AuthGuard>} />
            <Route path="/reports" element={<AuthGuard><ReportsPage /></AuthGuard>} />
            <Route path="/ai" element={<AuthGuard><AIAssistantPage /></AuthGuard>} />
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
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#fa541c' } }}>
      <AntdApp>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}
