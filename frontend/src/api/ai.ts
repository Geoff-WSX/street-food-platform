import api from './index';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  suggestedPosts: number[];
}

// AI 对话（增加超时时间到 90 秒）
export const chatWithAI = (data: {
  message: string;
  conversationHistory?: ChatMessage[];
  systemPrompt?: string;
  mode?: 'foodie' | 'admin';
}, signal?: AbortSignal) => {
  return api.post<{ success: boolean; data: ChatResponse; message: string }>('/ai/chat', data, { timeout: 90000, signal });
};
