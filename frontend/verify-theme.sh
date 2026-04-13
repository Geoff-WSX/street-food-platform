#!/bin/bash

echo "🎨 主题系统验证脚本"
echo "===================="
echo ""

# 检查前端目录
if [ ! -d "/Users/Zhuanz/street-food-platform/frontend" ]; then
  echo "❌ 前端目录不存在"
  exit 1
fi

cd /Users/Zhuanz/street-food-platform/frontend

echo "✅ 前端目录存在"
echo ""

# 检查关键文件
echo "📁 检查关键文件..."
files=(
  "src/components/ThemeSwitcher.tsx"
  "src/store/theme.ts"
  "src/styles/theme.css"
  "src/styles/themeFixes.css"
  "THEME_GUIDE.md"
  "THEME_VARS.md"
  "IMPLEMENTATION_SUMMARY.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file 不存在"
  fi
done

echo ""
echo "🔍 检查 ThemeSwitcher 组件..."
if grep -q "Dropdown" src/components/ThemeSwitcher.tsx; then
  echo "  ❌ ThemeSwitcher 仍然使用 Dropdown"
else
  echo "  ✅ ThemeSwitcher 已移除 Dropdown"
fi

if grep -q "var(--text-primary)" src/components/ThemeSwitcher.tsx; then
  echo "  ✅ ThemeSwitcher 使用 CSS 变量"
else
  echo "  ❌ ThemeSwitcher 未使用 CSS 变量"
fi

echo ""
echo "🔍 检查 Navbar 组件..."
if grep -q "#262626" src/components/Navbar.tsx; then
  echo "  ❌ Navbar 仍有硬编码颜色 #262626"
else
  echo "  ✅ Navbar 已移除硬编码颜色"
fi

if grep -q "var(--text-primary)" src/components/Navbar.tsx; then
  echo "  ✅ Navbar 使用 CSS 变量"
else
  echo "  ❌ Navbar 未使用 CSS 变量"
fi

echo ""
echo "🔍 检查 App.tsx 主题配置..."
if grep -q "themeFixes.css" src/App.tsx; then
  echo "  ✅ App.tsx 已引入 themeFixes.css"
else
  echo "  ❌ App.tsx 未引入 themeFixes.css"
fi

if grep -q "theme.darkAlgorithm" src/App.tsx; then
  echo "  ✅ App.tsx 使用 Ant Design 主题算法"
else
  echo "  ❌ App.tsx 未配置 Ant Design 主题"
fi

echo ""
echo "📊 统计 CSS 变量使用情况..."
echo "  theme.css 中的变量数量:"
grep -c "^[[:space:]]*--[a-z-]*:" src/styles/theme.css || echo "  0"

echo ""
echo "  themeFixes.css 中的变量引用:"
grep -c "var(--" src/styles/themeFixes.css || echo "  0"

echo ""
echo "===================="
echo "✅ 验证完成！"
echo ""
echo "📚 相关文档:"
echo "  - THEME_GUIDE.md: 主题系统使用指南"
echo "  - THEME_VARS.md: 主题变量快速参考"
echo "  - IMPLEMENTATION_SUMMARY.md: 实施总结"
