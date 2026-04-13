import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './reset.css'
import './styles/foodAnimations.css'
import './styles/responsive.css'
import './styles/theme.css'
import './styles/themeEnhancements.css'

// 初始化项目监控器
import './utils/monitor'

// 初始化主题系统
import { initTheme } from './store/theme'

// 在应用启动时初始化主题
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
