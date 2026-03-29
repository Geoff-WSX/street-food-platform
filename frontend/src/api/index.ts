import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('API Request:', config.method?.toUpperCase(), config.url);
  return config;
});

api.interceptors.response.use(
  (res) => {
    console.log('API Response:', res.status, res.config.url);
    return res;
  },
  (error) => {
    console.error('API Error:', error.config?.url, error.message);
    // 只在已登录但 token 失效时才跳转到登录页
    // 如果已经在登录页且登录失败，不要跳转
    const isLoginPage = window.location.pathname === '/login';
    if ((error.response?.status === 401 || error.response?.status === 403) && !isLoginPage) {
      // 401: token 无效或过期
      // 403: 账号被禁用
      localStorage.removeItem('sf_token');
      localStorage.removeItem('sf_user');
      // 显示错误信息
      if (error.response?.status === 403) {
        alert('您的账号已被禁用，请联系管理员');
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
