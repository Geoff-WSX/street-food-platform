import axios from 'axios';

// 生成唯一请求ID
const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// 根据环境动态设置 baseURL
const api = axios.create({
  baseURL: import.meta.env.MODE === 'production' ? '/api' : '/api',
  timeout: 30000,
});

// 请求ID映射，用于匹配响应
const pendingRequests = new Map<string, { url: string; startTime: number; cancelSource?: any }>();

// 请求拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 生成唯一请求ID
  const requestId = generateRequestId();
  config.headers['X-Request-Id'] = requestId;

  // 创建取消令牌
  const cancelSource = axios.CancelToken.source();
  config.cancelToken = cancelSource.token;

  // 记录请求
  pendingRequests.set(requestId, { url: config.url || '', startTime: Date.now(), cancelSource });

  console.log('🚀 API Request:', config.method?.toUpperCase(), config.url, 'id:', requestId);
  return config;
});

// 响应拦截器
api.interceptors.response.use(
  (res) => {
    const requestId = res.config.headers['X-Request-Id'] as string;
    if (requestId) {
      const pending = pendingRequests.get(requestId);
      if (pending) {
        console.log('✅ API Response:', res.status, pending.url, 'id:', requestId, 'duration:', Date.now() - pending.startTime + 'ms');
        pendingRequests.delete(requestId);
      }
    }
    return res;
  },
  (error) => {
    // 如果是取消的请求，不记录为错误
    if (axios.isCancel(error)) {
      console.log('⚠️  请求已取消:', error.message);
      return Promise.reject(error);
    }

    const requestId = error.config?.headers?.['X-Request-Id'] as string;
    if (requestId) {
      pendingRequests.delete(requestId);
    }

    console.error('❌ API Error:', error.config?.url, error.message, 'id:', requestId);
    if (error.response?.data) {
      console.error('❌ API Error Details:', error.response?.data);
    }

    // 只在已登录但 token 失效时才跳转到登录页
    const isLoginPage = window.location.pathname === '/login';
    if ((error.response?.status === 401 || error.response?.status === 403) && !isLoginPage) {
      localStorage.removeItem('sf_token');
      localStorage.removeItem('sf_user');
      if (error.response?.status === 403) {
        alert('您的账号已被禁用，请联系管理员');
      }
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// 定期清理过期的 pending 请求（超过30秒的）
setInterval(() => {
  const now = Date.now();
  for (const [id, req] of pendingRequests) {
    if (now - req.startTime > 30000) {
      console.warn('🧹 清理过期请求:', id, req.url);
      req.cancelSource?.cancel('请求超时已取消');
      pendingRequests.delete(id);
    }
  }
}, 10000);

// 导出取消所有请求的方法（用于组件卸载时清理）
export const cancelAllPendingRequests = () => {
  console.log('🛑 取消所有待处理请求...');
  for (const [, req] of pendingRequests) {
    req.cancelSource?.cancel('组件卸载，请求已取消');
  }
  pendingRequests.clear();
};

// 导出取消特定模式请求的方法
export const cancelRequestsWithPrefix = (prefix: string) => {
  console.log('🛑 取消包含前缀的请求:', prefix);
  for (const [id, req] of pendingRequests) {
    if (req.url.includes(prefix)) {
      req.cancelSource?.cancel('组件卸载，请求已取消');
      pendingRequests.delete(id);
    }
  }
};

export default api;
