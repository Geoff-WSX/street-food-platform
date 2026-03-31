import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { UpdateProfileRequest, ChangePasswordRequest } from '../types';
import { isValidUsername } from '../utils/validator';

/**
 * 获取用户信息
 */
export const getUserById = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      bio: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  return user;
};

/**
 * 更新用户资料
 */
export const updateProfile = async (
  userId: number,
  data: UpdateProfileRequest
) => {
  const { username, bio } = data;

  // 验证用户名
  if (username && !isValidUsername(username)) {
    throw new Error('用户名必须是3-20个字符，只能包含字母、数字和下划线');
  }

  // 检查用户名是否已被使用
  if (username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      throw new Error('用户名已被使用');
    }
  }

  // 更新用户
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(username && { username }),
      ...(bio !== undefined && { bio }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      bio: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

/**
 * 更新头像
 */
export const updateAvatar = async (userId: number, avatarPath: string) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarPath },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      bio: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

/**
 * 修改密码
 */
export const changePassword = async (
  userId: number,
  data: ChangePasswordRequest
) => {
  const { oldPassword, newPassword } = data;

  // 验证输入
  if (!oldPassword || !newPassword) {
    throw new Error('旧密码和新密码不能为空');
  }

  if (newPassword.length < 6) {
    throw new Error('新密码至少需要6个字符');
  }

  // 获取用户
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 验证旧密码
  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

  if (!isOldPasswordValid) {
    throw new Error('旧密码不正确');
  }

  // 加密新密码
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 更新密码
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { message: '密码修改成功' };
};

/**
 * 更新用户设置
 */
export const updateSettings = async (
  userId: number,
  data: { allowMessage?: boolean }
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.allowMessage !== undefined && { allowMessage: data.allowMessage }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      bio: true,
      allowMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};
