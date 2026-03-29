import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixNullCounts() {
  console.log('检查并修复 NULL count 值...\n');

  // 使用 Prisma API 查找有 NULL 值的记录
  const postsWithNull = await prisma.post.findMany({
    where: {
      OR: [
        { likeCount: null as any },
        { favoriteCount: null as any },
      ],
    },
    select: {
      id: true,
      likeCount: true,
      favoriteCount: true,
    },
    take: 10,
  });

  if (postsWithNull.length > 0) {
    console.log('找到有 NULL 值的动态:');
    postsWithNull.forEach(p => {
      console.log(`  ID: ${p.id}, likeCount: ${p.likeCount}, favoriteCount: ${p.favoriteCount}`);
    });

    // 修复 NULL 值
    const result = await prisma.post.updateMany({
      where: {
        OR: [
          { likeCount: null as any },
          { favoriteCount: null as any },
        ],
      },
      data: {
        likeCount: 0,
        favoriteCount: 0,
      },
    });

    console.log(`\n✅ 修复了 ${result.count} 条记录`);
  } else {
    console.log('✅ 没有发现 NULL 值问题');
  }

  // 显示统计
  const total = await prisma.post.count();
  console.log(`\n📊 总动态数: ${total}`);

  await prisma.$disconnect();
}

fixNullCounts();
