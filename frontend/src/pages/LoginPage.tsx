import { useState, useEffect } from 'react';
import { Form, Input, Button, message, Divider, Typography, Modal } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, FireOutlined, RocketOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login, register, getCaptcha, type CaptchaData } from '../api/auth';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import { getErrorMessage } from '../utils/error';
import FoodBackground from '../components/FoodBackground';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { getAnimationStyle, getRandomFoods } from '../utils/foodAnimations';

const { Text } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);
  const themeMode = useThemeStore((s) => s.mode);
  const isDark = themeMode === 'dark';
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 768,
    isSmallMobile: window.innerWidth < 480,
  });

  // 加载验证码
  const loadCaptcha = async (retryCount = 0) => {
    if (captchaLoading) {
      return;
    }
    setCaptchaLoading(true);
    try {
      const data = await getCaptcha();
      setCaptcha(data);
    } catch (error) {
      console.error('[Captcha] 获取验证码失败:', error);
      if (retryCount < 3) {
        setTimeout(() => loadCaptcha(retryCount + 1), 2000);
      }
    } finally {
      setCaptchaLoading(false);
    }
  };

  // 每次打开登录页都显示测试网站警告
  useEffect(() => {
    setWarningVisible(true);
  }, []);

  // 初始化验证码
  useEffect(() => {
    loadCaptcha();
  }, []);

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

  const handleLogin = async (values: { email: string; password: string; captchaCode: string }) => {
    setLoading(true);
    try {
      const res = await login({
        email: values.email,
        password: values.password,
        captchaId: captcha?.id || '',
        captchaCode: values.captchaCode || '',
      });
      loginStore(res.token, res.user);
      navigate('/');
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      if (errorMsg.includes('验证码')) {
        await loadCaptcha();
      }
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
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
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
        background: isDark
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
          : 'linear-gradient(135deg, #ff9a56 0%, #ff6b6b 50%, #ee5a24 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: screenSize.isSmallMobile ? '16px' : screenSize.isMobile ? '24px' : '40px',
      }}
    >
      {/* 美食背景 */}
      <FoodBackground count={25} minSize={20} maxSize={50} />

      {/* 主题切换按钮 - 右上角 */}
      <div style={{
        position: 'absolute',
        top: screenSize.isSmallMobile ? 16 : screenSize.isMobile ? 20 : 24,
        right: screenSize.isSmallMobile ? 16 : screenSize.isMobile ? 20 : 24,
        zIndex: 10,
      }}>
        <ThemeSwitcher size="middle" />
      </div>

      {/* 额外的大型美食图标 */}
      {getRandomFoods(8).map((food, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            fontSize: `${60 + Math.random() * 40}px`,
            opacity: 0.08,
            left: `${Math.random() * 80}%`,
            top: `${Math.random() * 80}%`,
            pointerEvents: 'none',
            ...getAnimationStyle('rotateFloat', 8 + Math.random() * 4, Math.random() * 3),
          }}
        >
          {food}
        </div>
      ))}
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

      {/* 测试网站警告弹窗 */}
      <Modal
        title={<span style={{ color: '#ff4d4f' }}>⚠️ 测试网站提示</span>}
        open={warningVisible}
        onOk={() => setWarningVisible(false)}
        onCancel={() => setWarningVisible(false)}
        okText="我已知晓"
        cancelText={null}
        centered
        width={400}
        zIndex={9999}
        maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          <p>👋 欢迎访问「食遇」测试网站！</p>
          <p style={{ color: '#ff4d4f', fontWeight: 600 }}>⚠️ 请勿输入真实个人信息！</p>
          <ul style={{ paddingLeft: 20, margin: '10px 0' }}>
            <li>不要使用真实手机号码</li>
            <li>不要输入真实密码</li>
            <li>不要上传真实头像照片</li>
          </ul>
          <p style={{ color: '#666', fontSize: 13 }}>本平台仍在测试阶段，所有数据可能会被随时清除。</p>
        </div>
      </Modal>

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
        <div style={{ textAlign: 'center', marginBottom: screenSize.isMobile ? 16 : 20 }}>
          <div
            style={{
              fontSize: screenSize.isSmallMobile ? 40 : screenSize.isMobile ? 48 : 60,
              marginBottom: screenSize.isSmallMobile ? 8 : 10,
              animation: 'bounce 2s ease-in-out infinite',
            }}
          >
            🍜
          </div>
          <h1
            style={{
              fontSize: screenSize.isSmallMobile ? 24 : screenSize.isMobile ? 30 : 36,
              fontWeight: 800,
              color: '#fff',
              margin: 0,
              textShadow: '0 4px 20px rgba(0,0,0,0.2)',
              letterSpacing: screenSize.isMobile ? 1 : 2,
            }}
          >
            食遇
          </h1>
          <Text
            style={{
              fontSize: screenSize.isSmallMobile ? 12 : 13,
              color: 'rgba(255,255,255,0.85)',
              display: 'block',
              marginTop: screenSize.isSmallMobile ? 4 : 6,
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
            borderRadius: screenSize.isMobile ? 12 : 14,
            padding: screenSize.isSmallMobile ? 4 : 5,
            marginBottom: screenSize.isMobile ? 16 : 20,
            backdropFilter: 'blur(10px)',
          }}
        >
          <button
            onClick={() => setIsLogin(true)}
            style={{
              flex: 1,
              padding: screenSize.isSmallMobile ? '10px 14px' : '12px 20px',
              border: 'none',
              borderRadius: screenSize.isMobile ? 8 : 10,
              background: isLogin ? 'rgba(255,255,255,0.95)' : 'transparent',
              color: isLogin ? '#764ba2' : '#fff',
              fontSize: screenSize.isSmallMobile ? 13 : 14,
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
              padding: screenSize.isSmallMobile ? '10px 14px' : '12px 20px',
              border: 'none',
              borderRadius: screenSize.isMobile ? 8 : 10,
              background: !isLogin ? 'rgba(255,255,255,0.95)' : 'transparent',
              color: !isLogin ? '#764ba2' : '#fff',
              fontSize: screenSize.isSmallMobile ? 13 : 14,
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
            background: isDark ? 'rgba(30, 30, 50, 0.98)' : 'rgba(255,255,255,0.98)',
            borderRadius: screenSize.isMobile ? 20 : 24,
            padding: screenSize.isSmallMobile ? '20px 18px' : screenSize.isMobile ? '24px 22px' : '32px 28px',
            boxShadow: isDark
              ? '0 20px 50px rgba(0,0,0,0.5)'
              : screenSize.isMobile ? '0 20px 50px rgba(0,0,0,0.15)' : '0 25px 70px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          {isLogin ? (
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <h2 style={{
                fontSize: screenSize.isSmallMobile ? 18 : 20,
                fontWeight: 700,
                color: isDark ? '#fff' : '#262626',
                margin: 0
              }}>
                欢迎回来 👋
              </h2>
              <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.65)' : undefined }}>登录到食遇</Text>
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <h2 style={{
                fontSize: screenSize.isSmallMobile ? 18 : 20,
                fontWeight: 700,
                color: isDark ? '#fff' : '#262626',
                margin: 0
              }}>
                加入我们 🎉
              </h2>
              <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.65)' : undefined }}>开启美食探索之旅</Text>
            </div>
          )}

          {/* 邮箱登录表单 */}
          {isLogin && (
            <Form layout="vertical" onFinish={handleLogin} className="form-fade-in">
              <Form.Item
                name="email"
                rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}
                style={{ marginBottom: screenSize.isSmallMobile ? 12 : 14 }}
              >
                <Input
                  size={screenSize.isSmallMobile ? 'middle' : 'large'}
                  prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="邮箱地址"
                  style={{
                    borderRadius: screenSize.isMobile ? 8 : 10,
                    padding: screenSize.isSmallMobile ? '8px 12px' : '10px 14px',
                    fontSize: screenSize.isSmallMobile ? 13 : 14,
                  }}
                />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
                style={{ marginBottom: screenSize.isSmallMobile ? 12 : 14 }}
              >
                <Input.Password
                  size={screenSize.isSmallMobile ? 'middle' : 'large'}
                  prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="密码"
                  style={{
                    borderRadius: screenSize.isMobile ? 8 : 10,
                    padding: screenSize.isSmallMobile ? '8px 12px' : '10px 14px',
                    fontSize: screenSize.isSmallMobile ? 13 : 14,
                  }}
                />
              </Form.Item>
              <Form.Item
                name="captchaCode"
                rules={[{ required: true, message: '请输入验证码' }]}
                style={{ marginBottom: screenSize.isSmallMobile ? 12 : 14 }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    size={screenSize.isSmallMobile ? 'middle' : 'large'}
                    placeholder="验证码"
                    maxLength={4}
                    style={{
                      flex: 1,
                      borderRadius: screenSize.isMobile ? 8 : 10,
                      padding: screenSize.isSmallMobile ? '8px 12px' : '10px 14px',
                      fontSize: screenSize.isSmallMobile ? 13 : 14,
                    }}
                  />
                  <div
                    style={{
                      cursor: 'pointer',
                      borderRadius: screenSize.isMobile ? 8 : 10,
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      minWidth: 80,
                      justifyContent: 'center',
                    }}
                    title="点击刷新验证码"
                  >
                    {captcha ? (
                      <img
                        src={`data:image/svg+xml;utf8,${encodeURIComponent(captcha.data)}`}
                        alt="验证码"
                        style={{ height: screenSize.isSmallMobile ? 32 : 38, display: 'block', cursor: 'pointer' }}
                        onClick={() => loadCaptcha()}
                        title="点击刷新验证码"
                      />
                    ) : captchaLoading ? (
                      <ReloadOutlined style={{ fontSize: 20, padding: '0 10px' }} spin />
                    ) : (
                      <span style={{ fontSize: 12, color: '#999', padding: '0 8px', cursor: 'pointer' }} onClick={() => loadCaptcha()}>点击刷新</span>
                    )}
                  </div>
                </div>
              </Form.Item>
              <Form.Item style={{ marginBottom: 6 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size={screenSize.isSmallMobile ? 'middle' : 'large'}
                  icon={screenSize.isSmallMobile ? undefined : <RocketOutlined />}
                  style={{
                    height: screenSize.isSmallMobile ? 38 : screenSize.isMobile ? 42 : 46,
                    borderRadius: screenSize.isMobile ? 8 : 10,
                    fontSize: screenSize.isSmallMobile ? 14 : 15,
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
          )}

          {/* 邮箱注册表单 */}
          {!isLogin && (
            <Form layout="vertical" onFinish={handleRegister} className="form-fade-in">
              <Form.Item
                name="username"
                style={{ marginBottom: screenSize.isSmallMobile ? 12 : 14 }}
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
                    borderRadius: screenSize.isMobile ? 8 : 10,
                    padding: screenSize.isSmallMobile ? '8px 12px' : '10px 14px',
                    fontSize: screenSize.isSmallMobile ? 13 : 14,
                  }}
                />
              </Form.Item>
              <Form.Item
                name="email"
                style={{ marginBottom: screenSize.isSmallMobile ? 12 : 14 }}
                rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}
              >
                <Input
                  size={screenSize.isSmallMobile ? 'middle' : 'large'}
                  prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="邮箱地址"
                  style={{
                    borderRadius: screenSize.isMobile ? 8 : 10,
                    padding: screenSize.isSmallMobile ? '8px 12px' : '10px 14px',
                    fontSize: screenSize.isSmallMobile ? 13 : 14,
                  }}
                />
              </Form.Item>
              <Form.Item
                name="password"
                style={{ marginBottom: screenSize.isSmallMobile ? 12 : 14 }}
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
                    borderRadius: screenSize.isMobile ? 8 : 10,
                    padding: screenSize.isSmallMobile ? '8px 12px' : '10px 14px',
                    fontSize: screenSize.isSmallMobile ? 13 : 14,
                  }}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 6 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size={screenSize.isSmallMobile ? 'middle' : 'large'}
                  icon={screenSize.isSmallMobile ? undefined : <FireOutlined />}
                  style={{
                    height: screenSize.isSmallMobile ? 38 : screenSize.isMobile ? 42 : 46,
                    borderRadius: screenSize.isMobile ? 8 : 10,
                    fontSize: screenSize.isSmallMobile ? 14 : 15,
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

          <Divider style={{ margin: screenSize.isMobile ? '16px 0' : '18px 0', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }}>
            <Text style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#999', fontSize: screenSize.isSmallMobile ? 11 : 12 }}>
              {isLogin ? '或' : '注册即表示同意用户协议'}
            </Text>
          </Divider>

          {/* 社交登录提示 */}
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#999', fontSize: screenSize.isSmallMobile ? 11 : 12 }}>
              {isLogin ? '还没有账号？' : '已有账号？'}
              <button
                onClick={() => setIsLogin(!isLogin)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDark ? '#a78bfa' : '#764ba2',
                  fontSize: screenSize.isSmallMobile ? 11 : 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '3px 6px',
                  marginLeft: 4,
                }}
              >
                {isLogin ? '去注册' : '去登录'}
              </button>
            </Text>
          </div>
        </div>

        {/* 底部提示 */}
        <div style={{ textAlign: 'center', marginTop: screenSize.isMobile ? 14 : 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: screenSize.isSmallMobile ? 10 : 11 }}>
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
        @keyframes formFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .form-fade-in {
          animation: formFadeIn 0.25s ease-out forwards;
        }
        input::-webkit-input-placeholder {
          color: ${isDark ? '#6b7280' : '#bfbfbf'};
        }
        .ant-input-affix-wrapper-focused {
          box-shadow: 0 0 0 2px rgba(118, 75, 162, 0.1) !important;
        }
        /* 暗色模式输入框样式 */
        .dark-theme .ant-input-affix-wrapper,
        [data-theme="dark"] .ant-input-affix-wrapper {
          background: rgba(50, 50, 80, 0.98) !important;
          border-color: rgba(255,255,255,0.15) !important;
        }
        .dark-theme .ant-input,
        [data-theme="dark"] .ant-input {
          background: transparent !important;
          color: #fff !important;
        }
        .dark-theme .ant-input-prefix,
        [data-theme="dark"] .ant-input-prefix {
          color: rgba(255,255,255,0.5) !important;
        }
        /* 禁止移动端双击缩放 */
        * {
          touch-action: manipulation;
        }
      `}</style>
    </div>
  );
}
