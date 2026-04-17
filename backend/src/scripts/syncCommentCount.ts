import prisma from '../services/db/prisma';

/**
 * 同步所有动态的评论数
 * 这个脚本会重新计算每个动态的顶级评论数量并更新到 commentCount 字段
 */
async function syncCommentCount() {
  try {
    console.log('开始同步动态评论数...');

    // 获取所有动态
    const posts = await prisma.post.findMany({
      select: {
        id: true,
        commentCount: true,
      },
    });

    console.log(`找到 ${posts.length} 条动态`);

    let updatedCount = 0;
    let totalComments = 0;

    // 逐个更新动态的评论数
    for (const post of posts) {
      // 计算实际的顶级评论数量（不包括回复）
      const actualCommentCount = await prisma.comment.count({
        where: {
          postId: post.id,
          parentId: null, // 只计算顶级评论
        },
      });

      totalComments += actualCommentCount;

      // 如果评论数不一致，更新
      if (post.commentCount !== actualCommentCount) {
        await prisma.post.update({
          where: { id: post.id },
          data: { commentCount: actualCommentCount },
        });
        updatedCount++;
        console.log(`动态 ${post.id}: ${post.commentCount} -> ${actualCommentCount}`);
      }
    }

    console.log(`\n同步完成！`);
    console.log(`- 总动态数: ${posts.length}`);
    console.log(`- 更新动态数: ${updatedCount}`);
    console.log(`- 总评论数: ${totalComments}`);
  } catch (error) {
    console.error('同步失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  syncCommentCount()
    .then(() => {
      console.log('脚本执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

export default syncCommentCount;
