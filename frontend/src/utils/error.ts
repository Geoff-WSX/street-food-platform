/**
 * 安全地从错误对象中提取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  // 处理 Axios 错误响应
  if (error && typeof error === 'object' && 'response' in error) {
    const err = error as { response?: { data?: { message?: string } } };
    return err.response?.data?.message || '操作失败';
  }

  // 处理字符串错误
  if (typeof error === 'string') {
    return error;
  }

  return '操作失败';
}
