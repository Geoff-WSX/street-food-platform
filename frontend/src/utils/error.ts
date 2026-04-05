/**
 * 安全地从错误对象中提取错误消息
 */
export function getErrorMessage(error: unknown): string {
  // 优先处理 Axios 错误响应（后端返回的具体错误信息）
  if (error && typeof error === 'object' && 'response' in error) {
    const err = error as {
      response?: {
        status?: number;
        data?: {
          error?: string;
          message?: string;
        };
      };
    };

    // 后端返回格式: { success: false, error: "错误信息", code: "..." }
    if (err.response?.data?.error) {
      return err.response.data.error;
    }

    // 备用字段 message
    if (err.response?.data?.message) {
      return err.response.data.message;
    }

    // 如果没有具体错误信息，根据状态码返回友好提示
    const status = err.response?.status;
    if (status === 401) return '邮箱或密码错误';
    if (status === 403) return '没有权限访问';
    if (status === 404) return '请求的资源不存在';
    if (status === 500) return '服务器错误，请稍后重试';
    if (status) return `请求失败 (${status})`;
  }

  // 处理标准 Error 对象（但 axios 错误会优先走上面的逻辑）
  if (error instanceof Error) {
    // 避免 axios 的通用错误消息
    if (error.message.startsWith('Request failed with status code')) {
      return '请求失败，请检查网络连接';
    }
    return error.message;
  }

  // 处理字符串错误
  if (typeof error === 'string') {
    return error;
  }

  return '操作失败';
}
