# 创建 GitHub Personal Access Token

## 步骤 1: 创建 Token

1. 打开浏览器，访问：
   https://github.com/settings/tokens

2. 点击右上角的 **Generate new token** → **Generate new token (classic)**

3. 填写信息：
   - **Name**: `street-food-platform` (或任意名称)
   - **Expiration**: 选择 `No expiration` 或 `90 days`
   - **Scopes**: 勾选以下权限：
     - ✅ `repo` (这会勾选下面所有的 repo 子选项)
     - ✅ `workflow` (如果需要 GitHub Actions)

4. 点击页面底部的 **Generate token**

5. **重要**: 复制生成的 token（格式类似 `ghp_xxxxxxxxxxxxxxxxxxxx`）
   - 这个 token 只显示一次，请立即保存！

---

## 步骤 2: 使用 Token 推送

创建 token 后，在终端重新执行推送命令：

### 方式 A: 在密码提示处粘贴 Token

```bash
git push -u origin main
```

当提示输入时：
- **Username**: `Geoff-WSX`
- **Password**: 粘贴刚才复制的 Token (不是你的 GitHub 密码)

### 方式 B: 在 URL 中包含 Token（推荐）

```bash
# 将 YOUR_TOKEN 替换为实际的 token
git remote set-url origin https://YOUR_TOKEN@github.com/Geoff-WSX/street-food-platform.git

# 然后推送（不再需要输入密码）
git push -u origin main
```

### 方式 C: 使用 Git Credential Manager（最推荐）

```bash
# 配置 credential helper
git config --global credential.helper osxkeychain

# 推送时会弹出登录窗口，只需输入一次
git push -u origin main
```

---

## Token 示例格式

生成的 token 长这样：
```
ghp_1234567890abcdefghijklmnopqrstuvwxyz
```

以 `ghp_` 开头，总共 40 个字符。

---

## 常见问题

**Q: 我找不到 "Generate new token" 按钮**
A: 确保你已登录 GitHub，直接访问这个链接：
   https://github.com/settings/personal-access-tokens

**Q: Token 创建后找不到**
A: Token 只在创建时显示一次，如果丢失了需要重新创建。

**Q: 还是提示认证失败**
A: 确保：
   1. Token 没有过期
   2. Token 勾选了 `repo` 权限
   3. 用户名是 `Geoff-WSX`（不是你的邮箱）
