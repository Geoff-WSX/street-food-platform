import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findAndFixProblematicPosts() {
  console.log('正在检查数据库中的动态...\n');

  // 获取所有动态
  const allPosts = await prisma.post.findMany({
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  console.log(`总共找到 ${allPosts.length} 条动态\n`);

  const problematicPosts: any[] = [];
  const validPosts: any[] = [];

  allPosts.forEach((post) => {
    let hasProblem = false;
    const issues: string[] = [];

    // 检查 images 字段
    if (!post.images) {
      hasProblem = true;
      issues.push('images 为 null');
    } else if (post.images === '') {
      hasProblem = true;
      issues.push('images 为空字符串');
    } else if (post.images === '[]') {
      hasProblem = true;
      issues.push('images 为空数组');
    } else {
      try {
        const parsedImages = JSON.parse(post.images);
        if (!Array.isArray(parsedImages)) {
          hasProblem = true;
          issues.push('images 不是数组');
        } else if (parsedImages.length === 0) {
          hasProblem = true;
          issues.push('images 数组为空');
        } else {
          // 检查每个图片 URL
          parsedImages.forEach((img: string, index: number) => {
            if (!img || img === '') {
              hasProblem = true;
              issues.push(`第 ${index + 1} 张图片为空`);
            } else if (img.includes('/uploads/')) {
              hasProblem = true;
              issues.push(`第 ${index + 1} 张图片使用本地路径`);
            }
          });
        }
      } catch (e) {
        hasProblem = true;
        issues.push('images JSON 解析失败');
      }
    }

    // 检查 content 字段
    if (!post.content || post.content === '') {
      hasProblem = true;
      issues.push('content 为空');
    }

    if (hasProblem) {
      problematicPosts.push({
        id: post.id,
        username: post.user.username,
        content: post.content?.substring(0, 50),
        images: post.images,
        issues,
      });
    } else {
      validPosts.push(post.id);
    }
  });

  console.log(`✅ 有效动态: ${validPosts.length} 条`);
  console.log(`❌ 有问题的动态: ${problematicPosts.length} 条\n`);

  if (problematicPosts.length > 0) {
    console.log('有问题的动态列表：');
    console.log('================\n');
    problematicPosts.forEach((post, index) => {
      console.log(`${index + 1}. ID: ${post.id} - 用户: ${post.username}`);
      console.log(`   问题: ${post.issues.join(', ')}`);
      console.log(`   images: ${post.images}`);
      console.log(`   content: ${post.content}`);
      console.log('---');
    });

    // 询问是否删除
    console.log('\n正在删除有问题的动态...');
    const idsToDelete = problematicPosts.map(p => p.id);
    const result = await prisma.post.deleteMany({
      where: {
        id: { in: idsToDelete },
      },
    });
    console.log(`✅ 已删除 ${result.count} 条有问题的动态`);
  } else {
    console.log('✅ 没有发现问题的动态');
  }

  // 显示剩余动态统计
  const remainingPosts = await prisma.post.count();
  console.log(`\n📊 剩余动态数量: ${remainingPosts} 条`);
}

async function main() {
  try {
    await findAndFixProblematicPosts();
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
