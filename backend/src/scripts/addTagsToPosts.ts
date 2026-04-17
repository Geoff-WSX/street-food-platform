/**
 * 为所有测试动态添加话题标签
 * 运行: npx ts-node src/scripts/addTagsToPosts.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// 预设话题列表
const tagNames = [
  '麻辣烫', '火锅', '烧烤', '小龙虾', '烤鱼', '炸鸡',
  '奶茶', '甜品', '蛋糕', '冰淇淋',
  '川菜', '粤菜', '湘菜', '鲁菜', '浙菜', '苏菜', '闽菜', '徽菜',
  '北京烤鸭', '炸酱面', '小笼包', '生煎', '锅贴',
  '面食', '米线', '粉', '饺子', '包子', '馒头',
  '海鲜', '日料', '韩料', '西餐', '东南亚菜',
  '街头小吃', '夜市', '早茶', '下午茶', '宵夜',
  '网红店', '老字号', '必吃榜', '性价比', '约会',
  '朋友聚餐', '家庭聚餐', '一人食', '下午茶',
];

// 美食关键词映射到话题
const foodTagMapping: Record<string, string[]> = {
  '烤鸭': ['北京烤鸭', '网红店'],
  '炸酱面': ['炸酱面', '面食', '老字号'],
  '小笼包': ['小笼包', '早点', '网红店'],
  '蟹黄': ['网红店', '海鲜', '必吃榜'],
  '小龙虾': ['小龙虾', '夜市', '宵夜', '朋友聚餐'],
  '火锅': ['火锅', '朋友聚餐', '家庭聚餐'],
  '串串': ['麻辣烫', '街头小吃', '宵夜'],
  '烧烤': ['烧烤', '夜市', '宵夜', '朋友聚餐'],
  '烤鱼': ['烤鱼', '朋友聚餐', '宵夜'],
  '炸鸡': ['炸鸡', '快餐', '网红店'],
  '奶茶': ['奶茶', '下午茶', '网红店'],
  '蛋糕': ['蛋糕', '甜品', '下午茶'],
  '冰淇淋': ['冰淇淋', '甜品', '网红店'],
  '川菜': ['川菜', '湘菜', '朋友聚餐'],
  '粤菜': ['粤菜', '早茶', '家庭聚餐'],
  '湘菜': ['湘菜', '川菜', '朋友聚餐'],
  '面条': ['面食', '早点', '一人食'],
  '米线': ['米线', '粉', '街头小吃'],
  '粉': ['粉', '米线', '街头小吃'],
  '饺子': ['饺子', '早点', '家庭聚餐'],
  '包子': ['包子', '早点', '街头小吃'],
  '海鲜': ['海鲜', '朋友聚餐', '约会'],
  '日料': ['日料', '海鲜', '约会'],
  '韩料': ['韩料', '朋友聚餐', '网红店'],
  '牛': ['火锅', '日料', '朋友聚餐'],
  '羊': ['烧烤', '火锅', '朋友聚餐'],
  '猪': ['川菜', '湘菜', '家庭聚餐'],
  '鸡': ['炸鸡', '快餐', '一人食'],
  '鱼': ['烤鱼', '川菜', '朋友聚餐'],
  '虾': ['海鲜', '日料', '朋友聚餐'],
  '蟹': ['海鲜', '网红店', '必吃榜'],
  '夜市': ['夜市', '街头小吃', '宵夜'],
  '必吃': ['必吃榜', '老字号', '网红店'],
  '推荐': ['必吃榜', '网红店', '老字号'],
  '好吃': ['必吃榜', '网红店', '老字号'],
};

async function getOrCreateTag(tagName: string): Promise<{ id: number; name: string }> {
  const tag = await prisma.tag.upsert({
    where: { name: tagName },
    update: {},
    create: { name: tagName },
  });
  return tag;
}

async function addTagsToPosts() {
  console.log('开始为动态添加话题...\n');

  // 确保所有预设话题存在
  console.log('创建预设话题...');
  const createdTags: Map<string, number> = new Map();

  for (const tagName of tagNames) {
    const tag = await getOrCreateTag(tagName);
    createdTags.set(tag.name, tag.id);
  }
  console.log(`已创建 ${createdTags.size} 个话题\n`);

  // 获取所有动态
  const posts = await prisma.post.findMany({
    select: { id: true, content: true },
    orderBy: { id: 'asc' },
  });

  console.log(`找到 ${posts.length} 条动态\n`);

  let updatedCount = 0;
  const tagArray = Array.from(createdTags.entries());

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    // 根据内容匹配话题
    const matchedTags: number[] = [];
    const content = post.content;

    for (const [keyword, tags] of Object.entries(foodTagMapping)) {
      if (content.includes(keyword)) {
        for (const tagName of tags) {
          const tagId = createdTags.get(tagName);
          if (tagId && !matchedTags.includes(tagId)) {
            matchedTags.push(tagId);
          }
        }
      }
    }

    // 如果没有匹配到关键词，随机添加 1-3 个话题
    if (matchedTags.length === 0) {
      const randomCount = Math.floor(Math.random() * 3) + 1;
      const shuffledTags = tagArray.sort(() => Math.random() - 0.5);
      for (let j = 0; j < Math.min(randomCount, shuffledTags.length); j++) {
        if (!matchedTags.includes(shuffledTags[j][1])) {
          matchedTags.push(shuffledTags[j][1]);
        }
      }
    }

    // 只保留最多 3 个话题
    const finalTags = matchedTags.slice(0, 3);

    if (finalTags.length > 0) {
      // 删除旧的话题关联
      await prisma.postTag.deleteMany({
        where: { postId: post.id },
      });

      // 创建新的话题关联
      for (const tagId of finalTags) {
        await prisma.postTag.create({
          data: {
            postId: post.id,
            tagId: tagId,
          },
        });
      }

      updatedCount++;
    }

    if ((i + 1) % 500 === 0) {
      console.log(`已处理 ${i + 1} 条动态...`);
    }
  }

  console.log(`\n✅ 更新完成！`);
  console.log(`- 总动态数: ${posts.length}`);
  console.log(`- 添加话题数: ${updatedCount}`);

  // 统计话题使用情况
  const tagUsage = await prisma.tag.findMany({
    include: {
      _count: {
        select: { posts: true },
      },
    },
    orderBy: {
      posts: {
        _count: 'desc',
      },
    },
    take: 20,
  });

  console.log('\n热门话题 TOP 20:');
  tagUsage.forEach((tag, index) => {
    console.log(`${index + 1}. #${tag.name} - ${tag._count.posts} 条动态`);
  });
}

addTagsToPosts()
  .then(() => {
    console.log('\n程序执行完毕');
    process.exit(0);
  })
  .catch((error) => {
    console.error('执行出错:', error);
    process.exit(1);
  });
