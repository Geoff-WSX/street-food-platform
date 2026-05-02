import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 使用 Picsum 随机图片（可访问）
function getRandomImages(index: number, count: number = 1): string[] {
  const images: string[] = [];
  for (let i = 0; i < count; i++) {
    // 使用不同的 seed 保证每张图片不一样
    const seed = index * 10 + i;
    images.push(`https://picsum.photos/seed/${seed}/800/600`);
  }
  return images;
}

async function main() {
  console.log('开始更新动态图片为可访问的图片源...\n');

  const posts = await prisma.post.findMany({
    orderBy: { id: 'asc' },
  });

  let updated = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    // 每条动态1-2张图片
    const imageCount = i % 3 === 0 ? 2 : 1;
    const images = getRandomImages(post.id, imageCount);

    await prisma.post.update({
      where: { id: post.id },
      data: {
        images: JSON.stringify(images),
      },
    });

    updated++;
    if (updated % 50 === 0) {
      console.log(`已更新 ${updated}/${posts.length} 条动态`);
    }
  }

  console.log(`\n=== 完成 ===`);
  console.log(`共更新 ${updated} 条动态，使用 Picsum 图片源`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
