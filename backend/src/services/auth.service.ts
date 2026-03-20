import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { generateToken } from '../utils/jwt';
import { RegisterRequest, LoginRequest } from '../types';
import { isValidEmail, isValidUsername, isValidPassword } from '../utils/validator';

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

  // 创建用户
  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
    },
  });

  // 生成 token
  const token = generateToken({
    userId: user.id,
    username: user.username,
    email: user.email,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
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
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
    },
  };
};
