import { useState } from 'react';
import { Tabs, Form, Input, Button, Card, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api/auth';
import { useAuthStore } from '../store/auth';

const { Title } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await login(values);
      loginStore(res.token, res.user);
      navigate('/');
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
    } finally {
      setLoading(false);
    }
  };

  const LoginForm = (
    <Form layout="vertical" onFinish={handleLogin} style={{ marginTop: 16 }}>
      <Form.Item label="邮箱" name="email" rules={[{ required: true }, { type: 'email', message: '请输入有效邮箱' }]}>
        <Input size="large" placeholder="your@email.com" />
      </Form.Item>
      <Form.Item label="密码" name="password" rules={[{ required: true }]}>
        <Input.Password size="large" placeholder="请输入密码" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">登录</Button>
      </Form.Item>
    </Form>
  );

  const RegisterForm = (
    <Form layout="vertical" onFinish={handleRegister} style={{ marginTop: 16 }}>
      <Form.Item label="用户名" name="username" rules={[{ required: true }, { min: 3, max: 20, message: '3-20个字符，仅字母数字下划线' }]}>
        <Input size="large" placeholder="3-20个字符" />
      </Form.Item>
      <Form.Item label="邮箱" name="email" rules={[{ required: true }, { type: 'email', message: '请输入有效邮箱' }]}>
        <Input size="large" placeholder="your@email.com" />
      </Form.Item>
      <Form.Item label="密码" name="password" rules={[{ required: true }, { min: 6, message: '密码至少6位' }]}>
        <Input.Password size="large" placeholder="至少6位" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">注册</Button>
      </Form.Item>
    </Form>
  );

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ color: '#fa541c' }}>🍜 街边美食</Title>
      </div>
      <Card>
        <Tabs
          centered
          items={[
            { key: 'login', label: '登录', children: LoginForm },
            { key: 'register', label: '注册', children: RegisterForm },
          ]}
        />
      </Card>
    </div>
  );
}
