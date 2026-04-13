import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 测试环境前端配置
 * 用于在测试环境中验证功能
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5178,  // 测试前端端口（与开发前端 5176 区分）
    proxy: {
      '/api': {
        target: 'http://localhost:3002',  // 连接到测试后端
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist-test',
    emptyOutDir: true,
  },
  define: {
    __TEST_ENV__: JSON.stringify(true),
  },
})
