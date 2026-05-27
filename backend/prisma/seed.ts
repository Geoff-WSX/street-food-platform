import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { initUserLevel } from '../src/services/level.service';

const prisma = new PrismaClient();

async function main() {
  console.log('开始填充测试数据...');

  // 创建等级定义（必须在初始化用户等级之前）
  const levels = [
    { level: 1, name: '美食新手', minExp: 0, maxExp: 100, icon: '🌱', description: '刚踏入美食世界的新手' },
    { level: 2, name: '美食学徒', minExp: 100, maxExp: 300, icon: '🍀', description: '开始探索美食的学徒' },
    { level: 3, name: '美食达人', minExp: 300, maxExp: 600, icon: '🌸', description: '对美食有独特见解的达人' },
    { level: 4, name: '美食专家', minExp: 600, maxExp: 1000, icon: '⭐', description: '美食领域的专家' },
    { level: 5, name: '美食大师', minExp: 1000, maxExp: 2000, icon: '🔥', description: '美食界的大师级人物' },
    { level: 6, name: '美食传奇', minExp: 2000, maxExp: null, icon: '👑', description: '传奇美食家' },
  ];

  for (const lvl of levels) {
    await prisma.level.upsert({
      where: { level: lvl.level },
      update: {},
      create: lvl,
    });
  }
  console.log('等级数据填充完成');

  // 创建等级任务定义
  const tasks = [
    { taskKey: 'post_count', name: '发布动态', description: '发布至少1条美食动态，即可完成任务', expReward: 10, targetCount: 1, icon: '📝', isDaily: false },
    { taskKey: 'received_likes', name: '获得点赞', description: '所有动态累计获得10个点赞，即可完成任务', expReward: 5, targetCount: 10, icon: '❤️', isDaily: false },
    { taskKey: 'received_favorites', name: '获得收藏', description: '所有动态累计获得10次收藏，即可完成任务', expReward: 5, targetCount: 10, icon: '⭐', isDaily: false },
    { taskKey: 'give_likes', name: '点赞他人', description: '累计点赞10条他人的美食动态，即可完成任务', expReward: 1, targetCount: 10, icon: '👍', isDaily: false },
    { taskKey: 'give_favorites', name: '收藏他人', description: '累计收藏10条他人的美食动态，即可完成任务', expReward: 2, targetCount: 10, icon: '📌', isDaily: false },
    { taskKey: 'single_post_likes', name: '单条爆款', description: '单条动态获得20个点赞，成为"爆款"即可完成任务', expReward: 50, targetCount: 20, icon: '🔥', isDaily: false },
    { taskKey: 'following_count', name: '关注用户', description: '关注5位美食爱好者，即可完成任务', expReward: 5, targetCount: 5, icon: '👥', isDaily: false },
    { taskKey: 'followers_count', name: '粉丝数量', description: '拥有10位粉丝关注你，即可完成任务', expReward: 10, targetCount: 10, icon: '🎉', isDaily: false },
    { taskKey: 'comment_count', name: '评论数', description: '累计评论5条他人的美食动态，即可完成任务', expReward: 2, targetCount: 5, icon: '💬', isDaily: false },
    // 每日任务
    { taskKey: 'daily_view_posts', name: '浏览动态', description: '每日浏览10条美食动态，即可获得经验奖励', expReward: 5, targetCount: 10, icon: '👀', isDaily: true },
    { taskKey: 'daily_like', name: '每日点赞', description: '每日点赞3条动态，即可获得经验奖励', expReward: 2, targetCount: 3, icon: '👍', isDaily: true },
    { taskKey: 'daily_favorite', name: '每日收藏', description: '每日收藏1条动态，即可获得经验奖励', expReward: 2, targetCount: 1, icon: '⭐', isDaily: true },
    { taskKey: 'daily_comment', name: '每日评论', description: '每日评论1条动态，即可获得经验奖励', expReward: 3, targetCount: 1, icon: '💬', isDaily: true },
    { taskKey: 'daily_share', name: '每日分享', description: '每日分享1条动态，即可获得经验奖励', expReward: 2, targetCount: 1, icon: '🔗', isDaily: true },
    { taskKey: 'daily_login', name: '每日登录', description: '每日首次登录，即可获得经验奖励', expReward: 3, targetCount: 1, icon: '🎯', isDaily: true },
  ];

  for (const task of tasks) {
    await prisma.levelTask.upsert({
      where: { taskKey: task.taskKey },
      update: { description: task.description, isDaily: task.isDaily },
      create: task,
    });
  }
  console.log('任务数据填充完成');

  // 创建测试用户
  const hashedPassword = await bcrypt.hash('123456', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'test1@example.com' },
    update: {},
    create: {
      username: 'foodie_01',
      email: 'test1@example.com',
      password: hashedPassword,
      bio: '喜欢探索各种街边小吃',
    },
  });

  // 初始化用户等级
  await initUserLevel(user1.id);

  const user2 = await prisma.user.upsert({
    where: { email: 'test2@example.com' },
    update: {},
    create: {
      username: 'foodie_02',
      email: 'test2@example.com',
      password: hashedPassword,
      bio: '美食达人，走遍大街小巷',
    },
  });

  // 初始化用户等级
  await initUserLevel(user2.id);

  // 创建测试动态
  const post1 = await prisma.post.create({
    data: {
      userId: user1.id,
      content: '今天发现了一家超级好吃的煎饼果子摊，外皮酥脆，里面料足！强烈推荐！',
      images: JSON.stringify(['/uploads/posts/sample1.jpg']),
      address: '北京市朝阳区三里屯',
      latitude: 39.9303,
      longitude: 116.4551,
    },
  });

  await prisma.post.create({
    data: {
      userId: user2.id,
      content: '路边摊的烤红薯，香甜软糯，冬天必吃！',
      images: JSON.stringify(['/uploads/posts/sample2.jpg', '/uploads/posts/sample3.jpg']),
      address: '上海市静安区南京西路',
      latitude: 31.2304,
      longitude: 121.4737,
    },
  });

  // 点赞
  await prisma.like.create({
    data: { userId: user2.id, postId: post1.id },
  });
  await prisma.post.update({
    where: { id: post1.id },
    data: { likeCount: { increment: 1 } },
  });

  console.log('测试数据填充完成！');
  console.log(`用户1: ${user1.email} / 123456`);
  console.log(`用户2: ${user2.email} / 123456`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
