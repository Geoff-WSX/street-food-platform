import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { App as AntdApp, Layout, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Navbar from './components/Navbar';
import AuthGuard from './components/AuthGuard';
import HomePage from './pages/HomePage';
import PostDetailPage from './pages/PostDetailPage';
import PublishPage from './pages/PublishPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

const { Content } = Layout;

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#fa541c' } }}>
      <AntdApp>
        <BrowserRouter>
          <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
            <Navbar />
            <Content style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 24px' }}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/post/:id" element={<PostDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/publish"
                  element={
                    <AuthGuard>
                      <PublishPage />
                    </AuthGuard>
                  }
                />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </Content>
          </Layout>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}
