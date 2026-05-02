import prisma from '../src/services/db/prisma';

async function addTagsToAllPosts() {
  // 获取所有话题
  const tags = await prisma.tag.findMany();
  console.log(`找到 ${tags.length} 个话题`);

  // 获取所有帖子
  const posts = await prisma.post.findMany({
    include: {
      tags: true
    }
  });

  console.log(`开始处理 ${posts.length} 条动态...`);

  for (const post of posts) {
    // 如果已经有话题标签，跳过
    if (post.tags && post.tags.length > 0) {
      console.log(`动态 ${post.id} 已有话题，跳过`);
      continue;
    }

    // 随机选择 1-3 个话题
    const randomTags: number[] = [];
    const tagCount = Math.floor(Math.random() * 3) + 1; // 1-3 个话题

    for (let i = 0; i < tagCount; i++) {
      const randomTag = tags[Math.floor(Math.random() * tags.length)];
      if (!randomTags.includes(randomTag.id)) {
        randomTags.push(randomTag.id);
      }
    }

    // 为帖子添加话题
    for (const tagId of randomTags) {
      await prisma.postTag.create({
        data: {
          postId: post.id,
          tagId: tagId
        }
      });
      console.log(`动态 ${post.id} 添加话题 ${tagId}`);
    }

    console.log(`动态 ${post.id} 完成`);
  }

  console.log('✅ 所有动态已添加话题');
}

addTagsToAllPosts()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
