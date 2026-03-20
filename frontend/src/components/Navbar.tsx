import { Layout, Menu, Button, Avatar, Space } from 'antd';
import { HomeOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const { Header } = Layout;

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const selectedKey = location.pathname === '/' ? 'home'
    : location.pathname.startsWith('/publish') ? 'publish'
    : location.pathname.startsWith('/profile') ? 'profile'
    : '';

  return (
    <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.1)' }}>
      <div
        style={{ fontSize: 18, fontWeight: 700, marginRight: 32, cursor: 'pointer', color: '#fa541c' }}
        onClick={() => navigate('/')}
      >
        🍜 街边美食
      </div>
      <Menu
        mode="horizontal"
        selectedKeys={[selectedKey]}
        style={{ flex: 1, border: 'none' }}
        items={[
          { key: 'home', icon: <HomeOutlined />, label: '首页', onClick: () => navigate('/') },
          { key: 'publish', icon: <PlusOutlined />, label: '发布', onClick: () => navigate('/publish') },
          { key: 'profile', icon: <UserOutlined />, label: '我的', onClick: () => navigate('/profile') },
        ]}
      />
      <Space>
        {isLoggedIn ? (
          <>
            <Avatar
              src={user?.avatarUrl}
              icon={<UserOutlined />}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/profile')}
            />
            <Button type="text" onClick={handleLogout}>退出</Button>
          </>
        ) : (
          <Button type="primary" onClick={() => navigate('/login')}>登录</Button>
        )}
      </Space>
    </Header>
  );
}
