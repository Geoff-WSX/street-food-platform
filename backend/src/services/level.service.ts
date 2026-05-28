import prisma from '../services/db/prisma';
import { pushTaskCompleteNotification, pushLevelUpNotification } from '../websocket/notification';

/**
 * 获取今日日期字符串
 */
const getTodayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 初始化用户等级（首次登录时调用）
 * 创建用户等级记录，默认为Lv1
 */
export const initUserLevel = async (userId: number) => {
  // 检查是否已有等级记录
  const existingLevel = await prisma.userLevel.findUnique({
    where: { userId },
  });

  if (existingLevel) {
    return existingLevel;
  }

  // 查找Lv1等级
  const level1 = await prisma.level.findUnique({
    where: { level: 1 },
  });

  if (!level1) {
    throw new Error('等级数据未初始化');
  }

  // 创建用户等级记录
  const userLevel = await prisma.userLevel.create({
    data: {
      userId,
      levelId: level1.id,
      exp: 0,
    },
    include: {
      level: true,
    },
  });

  // 初始化所有任务进度（每日任务除外，在首次完成时创建）
  const tasks = await prisma.levelTask.findMany({
    where: { isActive: true, isDaily: false },
  });

  await prisma.userLevelProgress.createMany({
    data: tasks.map(task => ({
      userLevelId: userLevel.id,
      levelTaskId: task.id,
      currentCount: 0,
      completed: false,
    })),
  });

  return userLevel;
};

/**
 * 获取用户等级信息（含进度）
 */
export const getUserLevelInfo = async (userId: number) => {
  let userLevel = await prisma.userLevel.findUnique({
    where: { userId },
    include: {
      level: true,
      progress: {
        include: {
          levelTask: true,
        },
      },
    },
  });

  // 如果没有等级记录，初始化
  if (!userLevel) {
    await initUserLevel(userId);
    // 重新获取包含进度的信息
    userLevel = await prisma.userLevel.findUnique({
      where: { userId },
      include: {
        level: true,
        progress: {
          include: {
            levelTask: true,
          },
        },
      },
    });
  }

  if (!userLevel) {
    throw new Error('用户等级信息获取失败');
  }

  // 确保 level 关系已加载
  if (!userLevel.level) {
    // 尝试重新加载 level
    const levelRecord = await prisma.level.findUnique({
      where: { id: userLevel.levelId },
    });
    if (!levelRecord) {
      throw new Error('用户等级数据异常：找不到对应的等级');
    }
    userLevel.level = levelRecord;
  }

  // 计算下一个等级
  const nextLevel = await prisma.level.findUnique({
    where: { level: userLevel.level.level + 1 },
  });

  // 计算距离下一级还需要多少经验
  const expToNextLevel = nextLevel ? nextLevel.minExp - userLevel.exp : null;

  // 分离每日任务和普通任务
  const today = getTodayStr();
  const regularProgress = userLevel.progress.filter(p => !p.levelTask.isDaily);
  const dailyProgress = userLevel.progress.filter(p => p.levelTask.isDaily && p.taskDate === today);

  // 获取所有每日任务定义，用于显示未开始的每日任务
  const allDailyTasks = await prisma.levelTask.findMany({
    where: { isActive: true, isDaily: true },
  });

  // 合并每日任务进度（包含已完成和未开始的）
  const dailyProgressWithDefaults = allDailyTasks.map(task => {
    const existing = dailyProgress.find(p => p.levelTaskId === task.id);
    if (existing) {
      return {
        taskKey: task.taskKey,
        taskName: task.name,
        description: task.description,
        currentCount: existing.currentCount,
        targetCount: task.targetCount,
        expReward: task.expReward,
        completed: existing.completed,
        completedAt: existing.completedAt,
        progress: Math.min(100, Math.round((existing.currentCount / task.targetCount) * 100)),
      };
    }
    return {
      taskKey: task.taskKey,
      taskName: task.name,
      description: task.description,
      currentCount: 0,
      targetCount: task.targetCount,
      expReward: task.expReward,
      completed: false,
      completedAt: null,
      progress: 0,
    };
  });

  return {
    userId: userLevel.userId,
    currentLevel: userLevel.level,
    exp: userLevel.exp,
    expToNextLevel,
    nextLevel,
    progress: [
      ...regularProgress.map(p => ({
        taskKey: p.levelTask.taskKey,
        taskName: p.levelTask.name,
        description: p.levelTask.description,
        currentCount: p.currentCount,
        targetCount: p.levelTask.targetCount,
        expReward: p.levelTask.expReward,
        completed: p.completed,
        completedAt: p.completedAt,
        progress: Math.min(100, Math.round((p.currentCount / p.levelTask.targetCount) * 100)),
      })),
      ...dailyProgressWithDefaults,
    ],
  };
};

/**
 * 增加经验值并检查升级
 * 返回是否升级以及升级信息
 */
export const addExp = async (userId: number, amount: number, reason: string) => {
  let userLevel = await prisma.userLevel.findUnique({
    where: { userId },
    include: { level: true },
  });

  // 如果没有等级记录，初始化
  if (!userLevel) {
    await initUserLevel(userId);
    userLevel = await prisma.userLevel.findUnique({
      where: { userId },
      include: { level: true },
    });
  }

  if (!userLevel) {
    throw new Error('用户等级初始化失败');
  }

  // 确保 level 关系已加载
  if (!userLevel.level) {
    const levelRecord = await prisma.level.findUnique({
      where: { id: userLevel.levelId },
    });
    if (!levelRecord) {
      throw new Error('用户等级数据异常：找不到对应的等级');
    }
    userLevel.level = levelRecord;
  }

  const oldLevel = userLevel.level;
  const oldExp = userLevel.exp;
  const newExp = oldExp + amount;

  // 检查是否可以升级
  let newLevel = oldLevel;
  let currentExp = newExp;

  // 循环检查直到达到最高可升级数
  let canUpgrade = true;
  while (canUpgrade) {
    const nextLevel = await prisma.level.findUnique({
      where: { level: newLevel.level + 1 },
    });

    if (nextLevel && currentExp >= nextLevel.minExp) {
      // 检查是否有最高等级限制
      if (nextLevel.maxExp === null || currentExp < nextLevel.maxExp) {
        newLevel = nextLevel;
      } else {
        canUpgrade = false;
      }
    } else {
      canUpgrade = false;
    }
  }

  // 更新用户等级
  const updatedUserLevel = await prisma.userLevel.update({
    where: { userId },
    data: {
      levelId: newLevel.id,
      exp: currentExp,
    },
    include: { level: true },
  });

  const leveledUp = newLevel.level > oldLevel.level;

  // 发送升级通知
  if (leveledUp) {
    pushLevelUpNotification(userId, {
      oldLevel: oldLevel.level,
      newLevel: newLevel.level,
      levelName: newLevel.name,
    });
  }

  return {
    leveledUp,
    oldLevel: leveledUp ? oldLevel : null,
    newLevel: leveledUp ? newLevel : null,
    expAdded: amount,
    reason,
    currentExp: currentExp,
    currentLevel: updatedUserLevel.level,
  };
};

/**
 * 更新任务进度
 * 根据taskKey更新对应的任务进度
 */
export const updateTaskProgress = async (userId: number, taskKey: string, newCount: number) => {
  let userLevel = await prisma.userLevel.findUnique({
    where: { userId },
  });

  // 如果没有等级记录，初始化
  if (!userLevel) {
    await initUserLevel(userId);
    userLevel = await prisma.userLevel.findUnique({
      where: { userId },
    });
  }

  if (!userLevel) {
    throw new Error('用户等级初始化失败');
  }

  // 查找任务
  const task = await prisma.levelTask.findUnique({
    where: { taskKey },
  });

  if (!task || !task.isActive) {
    throw new Error('任务不存在或已禁用');
  }

  const today = getTodayStr();
  const isDailyTask = task.isDaily;

  // 每日任务检查：如果是每日任务且已完成上限，忽略更新
  if (isDailyTask && newCount > task.targetCount) {
    return {
      taskKey,
      taskName: task.name,
      currentCount: task.targetCount,
      targetCount: task.targetCount,
      completed: true,
      expReward: task.expReward,
      justCompleted: false,
      maxReached: true,
    };
  }

  // 查找进度记录（普通任务）或今日进度（每日任务）
  let progress;
  if (isDailyTask) {
    progress = await prisma.userLevelProgress.findFirst({
      where: {
        userLevelId: userLevel.id,
        levelTaskId: task.id,
        taskDate: today,
      },
    });
  } else {
    // 非每日任务：使用 findFirst 查询（唯一约束已变为 [userLevelId, levelTaskId, taskDate]，null值不参与唯一约束）
    progress = await prisma.userLevelProgress.findFirst({
      where: {
        userLevelId: userLevel.id,
        levelTaskId: task.id,
        taskDate: null,
      },
    });
  }

  if (!progress) {
    // 创建新进度记录
    progress = await prisma.userLevelProgress.create({
      data: {
        userLevelId: userLevel.id,
        levelTaskId: task.id,
        currentCount: 0,
        completed: false,
        ...(isDailyTask && { taskDate: today }),
      },
    });
  }

  // 检查是否已完成
  const isNowCompleted = newCount >= task.targetCount;
  const wasCompleted = progress.completed;

  // 更新进度
  const updatedProgress = await prisma.userLevelProgress.update({
    where: { id: progress.id },
    data: {
      currentCount: newCount,
      completed: isNowCompleted,
      completedAt: isNowCompleted && !wasCompleted ? new Date() : progress.completedAt,
    },
    include: {
      levelTask: true,
    },
  });

  // 如果是首次完成，发放奖励
  if (isNowCompleted && !wasCompleted) {
    await addExp(userId, task.expReward, `完成任务: ${task.name}`);
    // 发送任务完成通知
    pushTaskCompleteNotification(userId, {
      taskKey: task.taskKey,
      taskName: task.name,
      expReward: task.expReward,
    });
  }

  return {
    taskKey,
    taskName: task.name,
    currentCount: newCount,
    targetCount: task.targetCount,
    completed: updatedProgress.completed,
    expReward: task.expReward,
    justCompleted: isNowCompleted && !wasCompleted,
  };
};

/**
 * 增加任务进度（用于每日任务等需要递增的场景）
 */
export const incrementTaskProgress = async (userId: number, taskKey: string, increment: number = 1) => {
  let userLevel = await prisma.userLevel.findUnique({
    where: { userId },
  });

  // 如果用户等级记录不存在，初始化它
  if (!userLevel) {
    await initUserLevel(userId);
    userLevel = await prisma.userLevel.findUnique({
      where: { userId },
    });
    if (!userLevel) {
      throw new Error('用户等级初始化失败');
    }
  }

  const task = await prisma.levelTask.findUnique({
    where: { taskKey },
  });

  if (!task || !task.isActive) {
    throw new Error('任务不存在或已禁用');
  }

  const today = getTodayStr();
  const isDailyTask = task.isDaily;

  // 查找现有进度
  let progress;
  if (isDailyTask) {
    progress = await prisma.userLevelProgress.findFirst({
      where: {
        userLevelId: userLevel.id,
        levelTaskId: task.id,
        taskDate: today,
      },
    });
  } else {
    // 非每日任务：使用 findFirst 查询（唯一约束已变为 [userLevelId, levelTaskId, taskDate]，null值不参与唯一约束）
    progress = await prisma.userLevelProgress.findFirst({
      where: {
        userLevelId: userLevel.id,
        levelTaskId: task.id,
        taskDate: null,
      },
    });
  }

  // 计算新的进度
  const currentCount = progress?.currentCount || 0;
  const newCount = Math.min(currentCount + increment, task.targetCount);

  // 如果已完成，不再处理
  if (progress?.completed) {
    return {
      taskKey,
      taskName: task.name,
      currentCount: progress.currentCount,
      targetCount: task.targetCount,
      completed: true,
      expReward: task.expReward,
      justCompleted: false,
      maxReached: true,
    };
  }

  // 如果已达上限，不再处理
  if (currentCount >= task.targetCount) {
    return {
      taskKey,
      taskName: task.name,
      currentCount: task.targetCount,
      targetCount: task.targetCount,
      completed: true,
      expReward: task.expReward,
      justCompleted: false,
      maxReached: true,
    };
  }

  const isNowCompleted = newCount >= task.targetCount;
  const wasCompleted = progress?.completed || false;

  if (progress) {
    await prisma.userLevelProgress.update({
      where: { id: progress.id },
      data: {
        currentCount: newCount,
        completed: isNowCompleted,
        completedAt: isNowCompleted && !wasCompleted ? new Date() : progress.completedAt,
      },
    });
  } else {
    // 创建新记录时，currentCount 直接设为 newCount（包含 increment）
    await prisma.userLevelProgress.create({
      data: {
        userLevelId: userLevel.id,
        levelTaskId: task.id,
        currentCount: newCount,
        completed: isNowCompleted,
        completedAt: isNowCompleted ? new Date() : null,
        ...(isDailyTask && { taskDate: today }),
      },
    });
  }

  // 如果是首次完成，发放奖励
  if (isNowCompleted && !wasCompleted) {
    await addExp(userId, task.expReward, `完成任务: ${task.name}`);
    pushTaskCompleteNotification(userId, {
      taskKey: task.taskKey,
      taskName: task.name,
      expReward: task.expReward,
    });
  }

  return {
    taskKey,
    taskName: task.name,
    currentCount: newCount,
    targetCount: task.targetCount,
    completed: isNowCompleted,
    expReward: task.expReward,
    justCompleted: isNowCompleted && !wasCompleted,
  };
};

/**
 * 检查并发放奖励（批量更新任务进度）
 * 用于根据用户实际数据批量检查任务完成状态
 */
export const checkAndGrantRewards = async (userId: number) => {
  // 获取用户统计信息
  const postCount = await prisma.post.count({
    where: { userId, isPrivate: false },
  });

  const receivedLikes = await prisma.like.count({
    where: { post: { userId } },
  });

  const receivedFavorites = await prisma.favorite.count({
    where: { post: { userId } },
  });

  const givenLikes = await prisma.like.count({
    where: { userId },
  });

  const givenFavorites = await prisma.favorite.count({
    where: { userId },
  });

  const followingCount = await prisma.follow.count({
    where: { followerId: userId },
  });

  const followerCount = await prisma.follow.count({
    where: { followingId: userId },
  });

  const commentCount = await prisma.comment.count({
    where: { userId },
  });

  // 获取单条动态的最高点赞和收藏
  const posts = await prisma.post.findMany({
    where: { userId, isPrivate: false },
    select: {
      likeCount: true,
      favoriteCount: true,
    },
  });

  const maxLikesOnSinglePost = posts.length > 0 ? Math.max(...posts.map(p => p.likeCount)) : 0;
  const maxFavoritesOnSinglePost = posts.length > 0 ? Math.max(...posts.map(p => p.favoriteCount)) : 0;

  // 任务映射
  const taskMappings = [
    { taskKey: 'post_count', count: postCount },
    { taskKey: 'received_likes', count: receivedLikes },
    { taskKey: 'received_favorites', count: receivedFavorites },
    { taskKey: 'give_likes', count: givenLikes },
    { taskKey: 'give_favorites', count: givenFavorites },
    { taskKey: 'single_post_likes', count: maxLikesOnSinglePost },
    { taskKey: 'single_post_favorites', count: maxFavoritesOnSinglePost },
    { taskKey: 'following_count', count: followingCount },
    { taskKey: 'followers_count', count: followerCount },
    { taskKey: 'comment_count', count: commentCount },
  ];

  const results = [];

  for (const mapping of taskMappings) {
    try {
      const result = await updateTaskProgress(userId, mapping.taskKey, mapping.count);
      results.push(result);
    } catch (error) {
      // 忽略错误，继续处理其他任务
      console.error(`更新任务 ${mapping.taskKey} 失败:`, error);
    }
  }

  return results;
};

/**
 * 获取所有等级定义
 */
export const getAllLevels = async () => {
  const levels = await prisma.level.findMany({
    orderBy: { level: 'asc' },
  });

  return levels;
};

/**
 * 获取所有任务定义
 */
export const getAllTasks = async () => {
  const tasks = await prisma.levelTask.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
  });

  return tasks;
};