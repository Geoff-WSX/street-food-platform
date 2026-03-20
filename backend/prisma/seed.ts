import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('开始填充测试数据...');

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
