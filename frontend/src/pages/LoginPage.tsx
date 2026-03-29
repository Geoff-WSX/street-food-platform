import { useState, useEffect } from 'react';
import { Form, Input, Button, message, Divider, Typography } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, FireOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api/auth';
import { useAuthStore } from '../store/auth';

const { Text } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 768,
    isSmallMobile: window.innerWidth < 480,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setScreenSize({
        width,
        height,
        isMobile: width < 768,
        isSmallMobile: width < 480,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await login(values);
      loginStore(res.token, res.user);
      navigate('/');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '登录失败，请检查邮箱和密码';
      void message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: { username: string; email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await register(values);
      loginStore(res.token, res.user);
      navigate('/');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '注册失败，请稍后重试';
      void message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 根据屏幕尺寸调整浮动元素
  const floatingFoods = screenSize.isMobile ? [
    { emoji: '🍜', top: '8%', left: '5%', size: 30, delay: 0 },
    { emoji: '🍢', top: '25%', right: '5%', size: 25, delay: 0.5 },
    { emoji: '🥟', top: '50%', left: '3%', size: 22, delay: 1 },
    { emoji: '🍡', top: '70%', right: '5%', size: 28, delay: 1.5 },
    { emoji: '🧇', top: '85%', left: '8%', size: 24, delay: 2 },
  ] : [
    { emoji: '🍜', top: '10%', left: '8%', size: 40, delay: 0 },
    { emoji: '🍢', top: '20%', right: '10%', size: 35, delay: 0.5 },
    { emoji: '🥟', top: '60%', left: '5%', size: 30, delay: 1 },
    { emoji: '🍡', top: '70%', right: '8%', size: 38, delay: 1.5 },
    { emoji: '🧇', top: '35%', left: '12%', size: 28, delay: 2 },
    { emoji: '🥙', top: '85%', left: '15%', size: 32, delay: 2.5 },
    { emoji: '🌮', top: '45%', right: '12%', size: 30, delay: 0.8 },
    { emoji: '🍦', top: '15%', left: '20%', size: 25, delay: 1.8 },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: screenSize.isSmallMobile ? '16px' : screenSize.isMobile ? '24px' : '40px',
      }}
    >
      {/* 浮动美食元素 */}
      {floatingFoods.map((food, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            fontSize: food.size * (screenSize.isSmallMobile ? 0.7 : screenSize.isMobile ? 0.85 : 1),
            opacity: screenSize.isSmallMobile ? 0.1 : 0.15,
            animation: `float ${6 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${food.delay}s`,
            ...food,
          }}
        >
          {food.emoji}
        </div>
      ))}

      {/* 装饰圆圈 - 移动端缩小 */}
      {!screenSize.isSmallMobile && (
        <>
          <div
            style={{
              position: 'absolute',
              width: screenSize.isMobile ? 300 : 500,
              height: screenSize.isMobile ? 300 : 500,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
              top: screenSize.isMobile ? -150 : -200,
              right: screenSize.isMobile ? -150 : -200,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: screenSize.isMobile ? 250 : 400,
              height: screenSize.isMobile ? 250 : 400,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
              bottom: screenSize.isMobile ? -100 : -150,
              left: screenSize.isMobile ? -100 : -150,
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* 主卡片 */}
      <div
        style={{
          width: '100%',
          maxWidth: screenSize.isSmallMobile ? '100%' : screenSize.isMobile ? 380 : 420,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo 区域 */}
        <div style={{ textAlign: 'center', marginBottom: screenSize.isMobile ? 24 : 40 }}>
          <div
            style={{
              fontSize: screenSize.isSmallMobile ? 50 : screenSize.isMobile ? 60 : 80,
              marginBottom: screenSize.isSmallMobile ? 12 : 16,
              animation: 'bounce 2s ease-in-out infinite',
            }}
          >
            🍜
          </div>
          <h1
            style={{
              fontSize: screenSize.isSmallMobile ? 28 : screenSize.isMobile ? 36 : 42,
              fontWeight: 800,
              color: '#fff',
              margin: 0,
              textShadow: '0 4px 20px rgba(0,0,0,0.2)',
              letterSpacing: screenSize.isMobile ? 1 : 2,
            }}
          >
            街边美食
          </h1>
          <Text
            style={{
              fontSize: screenSize.isSmallMobile ? 13 : 15,
              color: 'rgba(255,255,255,0.85)',
              display: 'block',
              marginTop: screenSize.isSmallMobile ? 6 : 8,
            }}
          >
            发现身边的烟火气 🎯
          </Text>
        </div>

        {/* 切换按钮 */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: screenSize.isMobile ? 14 : 16,
            padding: screenSize.isSmallMobile ? 5 : 6,
            marginBottom: screenSize.isMobile ? 24 : 32,
            backdropFilter: 'blur(10px)',
          }}
        >
          <button
            onClick={() => setIsLogin(true)}
            style={{
              flex: 1,
              padding: screenSize.isSmallMobile ? '12px 16px' : '14px 24px',
              border: 'none',
              borderRadius: screenSize.isMobile ? 10 : 12,
              background: isLogin ? 'rgba(255,255,255,0.95)' : 'transparent',
              color: isLogin ? '#764ba2' : '#fff',
              fontSize: screenSize.isSmallMobile ? 14 : 16,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: isLogin ? '0 4px 15px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            登录
          </button>
          <button
            onClick={() => setIsLogin(false)}
            style={{
              flex: 1,
              padding: screenSize.isSmallMobile ? '12px 16px' : '14px 24px',
              border: 'none',
              borderRadius: screenSize.isMobile ? 10 : 12,
              background: !isLogin ? 'rgba(255,255,255,0.95)' : 'transparent',
              color: !isLogin ? '#764ba2' : '#fff',
              fontSize: screenSize.isSmallMobile ? 14 : 16,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: !isLogin ? '0 4px 15px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            注册
          </button>
        </div>

        {/* 表单卡片 */}
        <div
          style={{
            background: 'rgba(255,255,255,0.98)',
            borderRadius: screenSize.isMobile ? 24 : 28,
            padding: screenSize.isSmallMobile ? '24px 20px' : screenSize.isMobile ? '32px 28px' : '48px 40px',
            boxShadow: screenSize.isMobile ? '0 20px 50px rgba(0,0,0,0.15)' : '0 25px 70px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          {isLogin ? (
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h2 style={{
                fontSize: screenSize.isSmallMobile ? 22 : 26,
                fontWeight: 700,
                color: '#262626',
                margin: 0
              }}>
                欢迎回来 👋
              </h2>
              <Text type="secondary" style={{ fontSize: 14 }}>登录到街边美食</Text>
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h2 style={{
                fontSize: screenSize.isSmallMobile ? 22 : 26,
                fontWeight: 700,
                color: '#262626',
                margin: 0
              }}>
                加入我们 🎉
              </h2>
              <Text type="secondary" style={{ fontSize: 14 }}>开启美食探索之旅</Text>
            </div>
          )}
          {isLogin ? (
            <Form layout="vertical" onFinish={handleLogin}>
              <Form.Item
                name="email"
                rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}
                style={{ marginBottom: screenSize.isSmallMobile ? 14 : 16 }}
              >
                <Input
                  size={screenSize.isSmallMobile ? 'middle' : 'large'}
                  prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="邮箱地址"
                  style={{
                    borderRadius: screenSize.isMobile ? 10 : 12,
                    padding: screenSize.isSmallMobile ? '10px 14px' : '12px 16px',
                    fontSize: screenSize.isSmallMobile ? 14 : 15,
                  }}
                />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
                style={{ marginBottom: screenSize.isSmallMobile ? 14 : 16 }}
              >
                <Input.Password
                  size={screenSize.isSmallMobile ? 'middle' : 'large'}
                  prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="密码"
                  style={{
                    borderRadius: screenSize.isMobile ? 10 : 12,
                    padding: screenSize.isSmallMobile ? '10px 14px' : '12px 16px',
                    fontSize: screenSize.isSmallMobile ? 14 : 15,
                  }}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 8 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size={screenSize.isSmallMobile ? 'middle' : 'large'}
                  icon={screenSize.isSmallMobile ? undefined : <RocketOutlined />}
                  style={{
                    height: screenSize.isSmallMobile ? 44 : screenSize.isMobile ? 48 : 50,
                    borderRadius: screenSize.isMobile ? 10 : 12,
                    fontSize: screenSize.isSmallMobile ? 15 : 16,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <Form layout="vertical" onFinish={handleRegister}>
              <Form.Item
                name="username"
                style={{ marginBottom: screenSize.isSmallMobile ? 14 : 16 }}
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, max: 20, message: '用户名长度为3-20个字符' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '仅支持字母、数字、下划线' },
                ]}
              >
                <Input
                  size={screenSize.isSmallMobile ? 'middle' : 'large'}
                  prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="用户名"
                  style={{
                    borderRadius: screenSize.isMobile ? 10 : 12,
                    padding: screenSize.isSmallMobile ? '10px 14px' : '12px 16px',
                    fontSize: screenSize.isSmallMobile ? 14 : 15,
                  }}
                />
              </Form.Item>
              <Form.Item
                name="email"
                style={{ marginBottom: screenSize.isSmallMobile ? 14 : 16 }}
                rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}
              >
                <Input
                  size={screenSize.isSmallMobile ? 'middle' : 'large'}
                  prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="邮箱地址"
                  style={{
                    borderRadius: screenSize.isMobile ? 10 : 12,
                    padding: screenSize.isSmallMobile ? '10px 14px' : '12px 16px',
                    fontSize: screenSize.isSmallMobile ? 14 : 15,
                  }}
                />
              </Form.Item>
              <Form.Item
                name="password"
                style={{ marginBottom: screenSize.isSmallMobile ? 14 : 16 }}
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6位' },
                ]}
              >
                <Input.Password
                  size={screenSize.isSmallMobile ? 'middle' : 'large'}
                  prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="密码（至少6位）"
                  style={{
                    borderRadius: screenSize.isMobile ? 10 : 12,
                    padding: screenSize.isSmallMobile ? '10px 14px' : '12px 16px',
                    fontSize: screenSize.isSmallMobile ? 14 : 15,
                  }}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 8 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size={screenSize.isSmallMobile ? 'middle' : 'large'}
                  icon={screenSize.isSmallMobile ? undefined : <FireOutlined />}
                  style={{
                    height: screenSize.isSmallMobile ? 44 : screenSize.isMobile ? 48 : 50,
                    borderRadius: screenSize.isMobile ? 10 : 12,
                    fontSize: screenSize.isSmallMobile ? 15 : 16,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(245, 87, 108, 0.4)',
                  }}
                >
                  立即注册
                </Button>
              </Form.Item>
            </Form>
          )}

          <Divider style={{ margin: screenSize.isMobile ? '20px 0' : '24px 0', borderColor: '#f0f0f0' }}>
            <Text style={{ color: '#999', fontSize: screenSize.isSmallMobile ? 12 : 13 }}>
              {isLogin ? '或' : '注册即表示同意用户协议'}
            </Text>
          </Divider>

          {/* 社交登录提示 */}
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: '#999', fontSize: screenSize.isSmallMobile ? 12 : 13 }}>
              {isLogin ? '还没有账号？' : '已有账号？'}
              <button
                onClick={() => setIsLogin(!isLogin)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#764ba2',
                  fontSize: screenSize.isSmallMobile ? 12 : 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  marginLeft: 4,
                }}
              >
                {isLogin ? '去注册' : '去登录'}
              </button>
            </Text>
          </div>
        </div>

        {/* 底部提示 */}
        <div style={{ textAlign: 'center', marginTop: screenSize.isMobile ? 20 : 24 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: screenSize.isSmallMobile ? 11 : 12 }}>
            记录城市味道 · 分享美食故事 📸
          </Text>
        </div>
      </div>

      {/* 全局动画样式 */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        input::-webkit-input-placeholder {
          color: #bfbfbf;
        }
        .ant-input-affix-wrapper-focused {
          box-shadow: 0 0 0 2px rgba(118, 75, 162, 0.1) !important;
        }
        /* 禁止移动端双击缩放 */
        * {
          touch-action: manipulation;
        }
      `}</style>
    </div>
  );
}
