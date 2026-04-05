import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAvatars() {
  console.log('开始更新用户头像...');

  // 获取所有没有头像的用户
  const usersWithoutAvatar = await prisma.user.findMany({
    where: {
      avatar: null,
    },
  });

  console.log(`找到 ${usersWithoutAvatar.length} 个没有头像的用户`);

  // 更新每个用户的头像
  for (const user of usersWithoutAvatar) {
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;

    await prisma.user.update({
      where: { id: user.id },
      data: { avatar },
    });

    console.log(`已更新用户 ${user.username} 的头像`);
  }

  console.log('所有用户头像更新完成！');
}

updateAvatars()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
