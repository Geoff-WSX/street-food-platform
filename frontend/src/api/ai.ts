import api from './index';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  suggestedPosts: number[];
  locationData?: boolean;
  city?: string;
}

// AI 文案生成 Prompt 模板
const FOOD_COPY_PROMPT_TEMPLATE = (keywords: string) => `你是一位专业的美食博主，擅长用生动的语言描述美食体验。

请根据以下关键词，帮我写一段吸引人的美食分享文案：

关键词：${keywords}

要求：
1. 文案要生动有趣，让人看了就有食欲
2. 突出美食的特色和亮点
3. 语言口语化，适合社交媒体分享
4. 长度控制在100-200字之间
5. 不要使用"综上所述"等正式用语
6. 可以适当使用emoji增加趣味性

请直接输出文案，不要有任何其他说明文字。`;

// AI 对话（增加超时时间到 90 秒）
export const chatWithAI = (data: {
  message: string;
  conversationHistory?: ChatMessage[];
  systemPrompt?: string;
  mode?: 'foodie' | 'admin';
}, signal?: AbortSignal) => {
  return api.post<{ success: boolean; data: ChatResponse; message: string }>('/ai/chat', data, { timeout: 90000, signal });
};

// AI 生成美食文案
export const generateFoodCopy = (keywords: string) => {
  return api.post<{ success: boolean; data: ChatResponse; message: string }>('/ai/chat', {
    message: FOOD_COPY_PROMPT_TEMPLATE(keywords),
    mode: 'foodie'
  }, { timeout: 60000 });
};
