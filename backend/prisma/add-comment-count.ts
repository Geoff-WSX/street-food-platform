import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addCommentCount() {
  // 获取所有动态
  const posts = await prisma.post.findMany();
  
  console.log(`找到 ${posts.length} 个动态，正在添加随机评论数...`);
  
  for (const post of posts) {
    // 生成随机评论数 (0-50)
    const commentCount = Math.floor(Math.random() * 51);
    
    await prisma.post.update({
      where: { id: post.id },
      data: { commentCount },
    });
    
    console.log(`动态 ${post.id}: 评论数设置为 ${commentCount}`);
  }
  
  console.log('完成！');
}

addCommentCount()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
