import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// 美食相关内容和图片
const foodContents = [
  '这家店的招牌菜太绝了！色香味俱全，下次还要来！',
  '终于找到了一家宝藏店铺！味道一级棒，价格也很实惠。',
  '朋友推荐过来的，果然没有让我失望！强烈推荐给大家。',
  '周末和家人一起来吃，气氛很好菜品也很棒！',
  '已经是第三次来了，每次都没有让我失望，推荐！',
  '这家店的服务态度很好，菜品也很新鲜，赞一个！',
  '性价比超高的店铺，学生党也可以放心冲！',
  '环境很棒，适合朋友聚会或者情侣约会。',
  '特色菜必点！吃了一次就忘不了这个味道了。',
  '食材新鲜，做法讲究，是一家有品质的店！',
  '位置很好找，店面装修得也很有特色。',
  '老板很热情，还会主动推荐招牌菜，很贴心！',
  '菜品分量足，味道好，下次还会再来！',
  '这家店的秘制酱料真的太香了，强烈推荐！',
  '性价比超高的一家店，已经推荐给朋友了。',
  '环境舒适，菜品精美，非常适合拍照打卡！',
  '老字号店铺，口碑好果然是有原因的。',
  '味道独特，在别的地方吃不到这个味道！',
  '食材新鲜看得见，吃得放心！',
  '价格实惠，份量足，学生党福音！',
];

const images = [
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
  'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800',
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800',
  'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800',
  'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800',
  'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800',
  'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800',
  'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  'https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800',
  'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800',
];

const cities = [
  { city: '北京市', district: '朝阳区', lat: 39.9219, lng: 116.4434 },
  { city: '北京市', district: '海淀区', lat: 39.9591, lng: 116.2984 },
  { city: '上海市', district: '黄浦区', lat: 31.2317, lng: 121.4737 },
  { city: '上海市', district: '浦东新区', lat: 31.2456, lng: 121.5441 },
  { city: '广州市', district: '天河区', lat: 23.1356, lng: 113.3288 },
  { city: '广州市', district: '越秀区', lat: 23.1379, lng: 113.2670 },
  { city: '深圳市', district: '南山区', lat: 22.5312, lng: 113.9295 },
  { city: '成都市', district: '锦江区', lat: 30.6586, lng: 104.0648 },
  { city: '成都市', district: '武侯区', lat: 30.6429, lng: 104.0433 },
  { city: '杭州市', district: '西湖区', lat: 30.2591, lng: 120.1291 },
  { city: '南京市', district: '玄武区', lat: 32.0603, lng: 118.7969 },
  { city: '武汉市', district: '武昌区', lat: 30.5728, lng: 114.3056 },
  { city: '西安市', district: '碑林区', lat: 34.2570, lng: 108.9480 },
  { city: '重庆市', district: '渝中区', lat: 29.5583, lng: 106.5079 },
  { city: '苏州市', district: '姑苏区', lat: 31.2989, lng: 120.5853 },
];

const commentContents = [
  '看起来太好吃了！求地址！',
  '这家店我知道，味道确实很棒！',
  '周末准备去试试，感谢推荐！',
  '已收藏，等有空就去！',
  '看着就流口水了，必须打卡！',
  '这家店的招牌菜我吃过，真的很不错！',
  '环境怎么样？适合聚会吗？',
  '价格贵不贵啊？人均多少？',
  '感谢博主推荐，已经去过了，确实好吃！',
  '有外卖吗？想吃！',
  '太诱人了，我已经约好朋友了！',
  '下次试试这个，看起来不错！',
  '博主推荐的一定要去试试！',
  '收藏了收藏了，下次去吃！',
  '这家店在我们这边很有名！',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomImages(): string {
  const count = randomInt(1, 3);
  const selected: string[] = [];
  for (let i = 0; i < count; i++) {
    const img = randomElement(images);
    if (!selected.includes(img)) {
      selected.push(img);
    }
  }
  return JSON.stringify(selected);
}

async function main() {
  console.log('🚀 开始创建大规模测试数据...');
  console.log('⚠️  注意：此脚本不会清理现有数据');

  // 创建超级管理员
  console.log('\n👤 创建超级管理员...');
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 管理员1: wsx@qq.com
  const admin1 = await prisma.user.upsert({
    where: { email: 'wsx@qq.com' },
    update: {},
    create: {
      email: 'wsx@qq.com',
      username: 'Geoff',
      password: hashedPassword,
      role: 'super_admin',
      bio: '系统超级管理员',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=geoff',
    },
  });
  console.log(`✅ 创建管理员: ${admin1.username} (${admin1.email}) ID: ${admin1.id}`);

  // 管理员2
  const admin2 = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      username: 'SystemAdmin',
      password: hashedPassword,
      role: 'super_admin',
      bio: '系统管理员',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sysadmin',
    },
  });
  console.log(`✅ 创建管理员: ${admin2.username} (${admin2.email}) ID: ${admin2.id}`);

  // 创建200个测试用户
  console.log('\n👥 创建200个测试用户...');
  const batchSize = 50;
  const totalUsers = 200;
  const usersPerPost = 20;
  const allUserIds: number[] = [];

  for (let batch = 0; batch < totalUsers / batchSize; batch++) {
    const startIdx = batch * batchSize;
    const endIdx = Math.min(startIdx + batchSize, totalUsers);
    const userBatch: any[] = [];

    for (let i = startIdx; i < endIdx; i++) {
      userBatch.push({
        email: `user${i + 1}@test.com`,
        username: `用户${i + 1}`,
        password: hashedPassword,
        role: 'user' as const,
        bio: `这是测试用户 ${i + 1}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${i + 1}`,
      });
    }

    await prisma.user.createMany({
      data: userBatch,
    });

    // 获取刚创建的用户ID
    const createdUsers = await prisma.user.findMany({
      where: {
        email: {
          in: userBatch.map(u => u.email),
        },
      },
      select: { id: true },
    });
    allUserIds.push(...createdUsers.map(u => u.id));

    console.log(`✅ 创建用户 ${startIdx + 1} - ${endIdx} 完成 (共 ${allUserIds.length} 个用户)`);
  }

  // 为每个用户创建20条动态
  console.log(`\n📝 为 ${allUserIds.length} 个用户创建动态 (每人20条，共 ${allUserIds.length * usersPerPost} 条)...`);

  let totalPosts = 0;
  let totalComments = 0;
  let totalLikes = 0;
  let totalFavorites = 0;

  for (let u = 0; u < allUserIds.length; u++) {
    const userId = allUserIds[u];
    const postsBatch: any[] = [];

    for (let p = 0; p < usersPerPost; p++) {
      const city = randomElement(cities);
      const likeCount = randomInt(5, 300);
      const favoriteCount = randomInt(3, 150);
      const commentCount = randomInt(0, 50);

      postsBatch.push({
        userId,
        content: `${randomElement(foodContents)} [用户${u + 1}的动态${p + 1}]`,
        images: generateRandomImages(),
        address: `${city.city}-${city.district}`,
        latitude: city.lat + (Math.random() - 0.5) * 0.1,
        longitude: city.lng + (Math.random() - 0.5) * 0.1,
        likeCount,
        favoriteCount,
        commentCount,
        isPrivate: false,
      });

      totalLikes += likeCount;
      totalFavorites += favoriteCount;
      totalComments += commentCount;
    }

    await prisma.post.createMany({
      data: postsBatch,
    });

    totalPosts += postsBatch.length;

    if ((u + 1) % 20 === 0 || u === allUserIds.length - 1) {
      console.log(`✅ 创建动态进度: ${u + 1}/${allUserIds.length} 用户, ${totalPosts} 条动态`);
    }
  }

  // 为所有动态创建评论
  console.log('\n💬 创建评论...');
  const allPosts = await prisma.post.findMany({
    select: { id: true, commentCount: true, userId: true },
    where: { userId: { in: allUserIds } },
  });

  let commentIdx = 0;
  for (const post of allPosts) {
    if (post.commentCount > 0) {
      const commentsBatch: any[] = [];
      // 随机选择评论用户（不能是帖子作者）
      const otherUsers = allUserIds.filter(id => id !== post.userId);

      for (let c = 0; c < Math.min(post.commentCount, otherUsers.length); c++) {
        commentsBatch.push({
          postId: post.id,
          userId: otherUsers[randomInt(0, otherUsers.length - 1)],
          content: randomElement(commentContents),
        });
      }

      if (commentsBatch.length > 0) {
        await prisma.comment.createMany({ data: commentsBatch });
        commentIdx++;
      }
    }

    if (commentIdx % 500 === 0 && commentIdx > 0) {
      console.log(`✅ 创建评论进度: ${commentIdx}/${allPosts.length} 帖子`);
    }
  }

  // 创建关注关系
  console.log('\n👥 创建关注关系...');
  const followBatch: any[] = [];
  for (const userId of allUserIds) {
    // 每个用户关注5-15个其他用户
    const followCount = randomInt(5, 15);
    const possibleFollows = allUserIds.filter(id => id !== userId);

    for (let f = 0; f < followCount && f < possibleFollows.length; f++) {
      const followingId = possibleFollows[randomInt(0, possibleFollows.length - 1)];
      followBatch.push({
        followerId: userId,
        followingId,
      });
    }
  }

  // 分批创建关注关系
  const followBatchSize = 500;
  for (let i = 0; i < followBatch.length; i += followBatchSize) {
    const batch = followBatch.slice(i, i + followBatchSize);
    await prisma.follow.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✅ 创建关注关系进度: ${Math.min(i + followBatchSize, followBatch.length)}/${followBatch.length}`);
  }

  console.log('\n🎉 大规模测试数据创建完成！');
  console.log('\n📊 数据统计:');
  console.log(`   - 超级管理员: 2 个`);
  console.log(`   - 测试用户: ${allUserIds.length} 个`);
  console.log(`   - 测试动态: ${totalPosts} 条`);
  console.log(`   - 评论数: ${totalComments} 条`);
  console.log(`   - 点赞数: ${totalLikes} 次`);
  console.log(`   - 收藏数: ${totalFavorites} 次`);
  console.log(`   - 关注关系: ${followBatch.length} 条`);

  console.log('\n📋 测试账号信息:');
  console.log('   超级管理员1: wsx@qq.com / 123456 (用户名: Geoff)');
  console.log('   超级管理员2: admin@test.com / 123456 (用户名: Admin)');
  console.log('   测试用户: user1@test.com ~ user200@test.com / 123456');
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
