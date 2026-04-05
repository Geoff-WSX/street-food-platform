import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { generateToken } from '../utils/jwt';
import { RegisterRequest, LoginRequest } from '../types';
import { isValidEmail, isValidUsername, isValidPassword } from '../utils/validator';
import axios from 'axios';

/**
 * 用户注册
 */
export const register = async (data: RegisterRequest) => {
  const { username, email, password } = data;

  // 验证输入
  if (!username || !email || !password) {
    throw new Error('用户名、邮箱和密码不能为空');
  }

  if (!isValidEmail(email)) {
    throw new Error('邮箱格式不正确');
  }

  if (!isValidUsername(username)) {
    throw new Error('用户名必须是3-20个字符，只能包含字母、数字和下划线');
  }

  if (!isValidPassword(password)) {
    throw new Error('密码至少需要6个字符');
  }

  // 检查用户名和邮箱是否已存在
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existingUser) {
    if (existingUser.username === username) {
      throw new Error('用户名已被使用');
    }
    if (existingUser.email === email) {
      throw new Error('邮箱已被注册');
    }
  }

  // 加密密码
  const hashedPassword = await bcrypt.hash(password, 10);

  // 生成默认头像
  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

  // 创建用户
  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      avatar: defaultAvatar,
    },
  });

  // 生成 token
  const token = generateToken({
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
};

/**
 * 用户登录
 */
export const login = async (data: LoginRequest) => {
  const { email, password } = data;

  // 验证输入
  if (!email || !password) {
    throw new Error('邮箱和密码不能为空');
  }

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('邮箱或密码错误');
  }

  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error('邮箱或密码错误');
  }

  // 生成 token
  const token = generateToken({
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
};

/**
 * 微信小程序登录
 */
export const wxLogin = async (code: string, userInfo?: any) => {
  // 开发模式：直接使用模拟登录
  const isDev = process.env.NODE_ENV !== 'production' || !process.env.WECHAT_APP_ID;

  if (isDev) {
    console.log('使用开发模式模拟微信登录');

    // 生成一个模拟 openid
    const mockOpenId = `dev_${code.slice(-10)}_${Date.now()}`;

    // 查找或创建模拟用户
    let user = await prisma.user.findUnique({
      where: { wechatOpenId: mockOpenId },
    });

    if (!user) {
      // 生成默认头像 URL（使用 DiceBear）
      const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${mockOpenId}`;

      user = await prisma.user.create({
        data: {
          wechatOpenId: mockOpenId,
          username: `微信用户${mockOpenId.slice(-6)}`,
          email: `wx_${mockOpenId}@temp.dev`,
          password: await bcrypt.hash(mockOpenId, 10),
          avatar: userInfo?.avatarUrl || defaultAvatar,
          role: 'user',
          isActive: true,
        },
      });
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }

  // 生产模式：真实的微信登录
  const appId = process.env.WECHAT_APP_ID!;
  const appSecret = process.env.WECHAT_APP_SECRET!;

  try {
    // 1. 使用 code 换取 openid 和 session_key
    const wxResponse = await axios.get(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`
    );

    const { openid, session_key, unionid, errcode, errmsg } = wxResponse.data;

    // 检查微信 API 错误
    if (errcode) {
      console.error('微信登录错误:', errcode, errmsg);
      throw new Error(`微信登录失败: ${errmsg || '未知错误'}`);
    }

    if (!openid) {
      throw new Error('获取微信用户信息失败');
    }

    // 2. 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { wechatOpenId: openid },
    });

    if (!user) {
      // 创建新用户
      const username = userInfo?.nickName || `微信用户${openid.slice(-6)}`;

      // 检查用户名是否已存在
      const existingUser = await prisma.user.findFirst({
        where: { username },
      });

      const finalUsername = existingUser
        ? `${username}_${openid.slice(-6)}`
        : username;

      // 使用微信头像或生成默认头像
      const avatar = userInfo?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${openid}`;

      user = await prisma.user.create({
        data: {
          wechatOpenId: openid,
          wechatUnionId: unionid,
          username: finalUsername,
          email: `wx_${openid}@wechat.temp`,
          password: await bcrypt.hash(openid, 10),
          avatar: avatar,
          role: 'user',
          isActive: true,
        },
      });
    }

    // 3. 生成 JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  } catch (error: any) {
    console.error('微信登录服务错误:', error);
    throw error;
  }
};
