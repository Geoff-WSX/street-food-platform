import prisma from '../src/services/db/prisma';
import { initUserLevel } from '../src/services/level.service';

async function main() {
  console.log('开始为所有现有用户初始化等级...');

  // 获取所有没有 userLevel 记录的用户
  const users = await prisma.user.findMany({
    include: {
      userLevel: true,
    },
  });

  console.log(`共找到 ${users.length} 个用户`);

  for (const user of users) {
    if (!user.userLevel) {
      console.log(`为用户 ${user.username} (ID: ${user.id}) 初始化等级...`);
      try {
        await initUserLevel(user.id);
        console.log(`  完成`);
      } catch (error) {
        console.error(`  失败: ${error}`);
      }
    } else {
      console.log(`用户 ${user.username} (ID: ${user.id}) 已有等级记录，跳过`);
    }
  }

  console.log('所有用户等级初始化完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
