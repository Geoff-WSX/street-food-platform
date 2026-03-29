import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPostCounts() {
  console.log('检查动态的 count 字段...\n');

  const posts = await prisma.post.findMany({
    select: {
      id: true,
      likeCount: true,
      favoriteCount: true,
    },
    take: 20,
  });

  posts.forEach((post) => {
    const likeCount = post.likeCount === null ? 'NULL' : post.likeCount;
    const favoriteCount = post.favoriteCount === null ? 'NULL' : post.favoriteCount;
    console.log(`ID: ${post.id} - likeCount: ${likeCount}, favoriteCount: ${favoriteCount}`);
  });

  // 检查是否有 NULL 值
  const nullLikes = await prisma.post.count({
    where: { likeCount: null as any },
  });

  const nullFavorites = await prisma.post.count({
    where: { favoriteCount: null as any },
  });

  console.log(`\n有 NULL likeCount 的动态: ${nullLikes} 条`);
  console.log(`有 NULL favoriteCount 的动态: ${nullFavorites} 条`);

  // 修复 NULL 值
  if (nullLikes > 0 || nullFavorites > 0) {
    console.log('\n正在修复 NULL 值...');
    await prisma.post.updateMany({
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
    console.log('✅ 修复完成');
  }

  await prisma.$disconnect();
}

checkPostCounts();
