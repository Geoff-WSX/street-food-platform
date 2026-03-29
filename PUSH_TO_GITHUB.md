# 推送项目到 GitHub 指南

## 步骤 1: 在 GitHub 上创建仓库

1. 打开浏览器，访问：https://github.com/new

2. 填写仓库信息：
   - **Repository name**: `street-food-platform`
   - **Description**: `街边美食平台 - 发现和分享街边美食的社交应用`
   - **Visibility**: 选择 **Private** (私有仓库)
   - **不要**勾选 "Add a README file"
   - **不要**勾选 "Add .gitignore"
   - **不要**选择 License

3. 点击 **Create repository**

4. 创建后，GitHub 会显示推送现有仓库的命令。

---

## 步骤 2: 在本地执行推送命令

打开终端，进入项目目录，然后执行以下命令：

```bash
cd /Users/Zhuanz/street-food-platform

# 添加 GitHub 远程仓库
git remote add origin https://github.com/Geoff-WSX/street-food-platform.git

# 推送代码到 GitHub
git push -u origin main
```

如果提示输入用户名和密码：
- **用户名**: Geoff-WSX
- **密码**: 使用 GitHub Personal Access Token (不是登录密码)

---

## 步骤 3: 创建 GitHub Personal Access Token (如果还没创建)

1. 打开 https://github.com/settings/tokens

2. 点击 **Generate new token** → **Generate new token (classic)**

3. 填写信息：
   - **Note**: street-food-platform
   - **Expiration**: 选择过期时间（建议 90 天或更长）
   - **Scopes**: 勾选以下权限：
     - `repo` (完整仓库访问权限)
     - `workflow` (如果需要 GitHub Actions)

4. 点击 **Generate token**

5. **重要**: 复制生成的 token（只显示一次，保存好）

---

## 步骤 4: 推送时使用 Token 认证

当执行 `git push` 时：
- **用户名**: 输入 `Geoff-WSX`
- **密码**: 粘贴刚才创建的 Personal Access Token

或者，可以在 URL 中直接包含 token：
```bash
# 使用 token 推送（替换 YOUR_TOKEN 为实际的 token）
git remote set-url origin https://YOUR_TOKEN@github.com/Geoff-WSX/street-food-platform.git
git push -u origin main
```

---

## 推送成功后

你的代码将会在以下地址：
https://github.com/Geoff-WSX/street-food-platform

---

## 常见问题

### Q: 推送时提示 "Authentication failed"
A: 确保使用 Personal Access Token 而不是 GitHub 登录密码

### Q: 提示 "Repository not found"
A: 检查仓库是否已创建，以及仓库名称是否正确

### Q: 推送太慢或失败
A: 可以尝试使用 SSH 方式：
```bash
git remote set-url origin git@github.com:Geoff-WSX/street-food-platform.git
git push -u origin main
```

---

## 下一步建议

推送成功后，可以：
1. 在 GitHub 上设置仓库描述和主题标签
2. 创建 `.github/README.md` 文件添加项目说明
3. 设置 GitHub Issues 和 Projects 进行项目管理
4. 配置 GitHub Actions 进行 CI/CD
