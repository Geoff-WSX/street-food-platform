import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const FOOD_ITEMS = [
  '煎饼果子', '烤冷面', '臭豆腐', '烤红薯', '糖葫芦', '肉夹馍', '鸡蛋灌饼', '手抓饼',
  '炸鸡排', '奶茶', '小龙虾', '火锅', '烧烤', '串串', '麻辣烫', '凉皮', '热干面',
  '包子', '油条', '豆浆', '豆腐脑', '煎饺', '锅贴', '生煎', '小笼包', '馄饨',
  '刀削面', '拉面', '烩面', '凉面', '冷面', '螺蛳粉', '肠粉', '叉烧饭', '煲仔饭',
];

const ADDRESSES = [
  { address: '北京市朝阳区三里屯', lat: 39.9303, lng: 116.4551 },
  { address: '上海市静安区南京西路', lat: 31.2304, lng: 121.4737 },
  { address: '广州市天河区珠江新城', lat: 23.1196, lng: 113.3228 },
  { address: '深圳市南山区科技园', lat: 22.5312, lng: 113.9298 },
  { address: '成都市锦江区春熙路', lat: 30.6587, lng: 104.0658 },
  { address: '杭州市西湖区湖滨', lat: 30.2489, lng: 120.1372 },
  { address: '武汉市江汉区江汉路', lat: 30.5852, lng: 114.3055 },
  { address: '西安市雁塔区小寨', lat: 34.2199, lng: 108.9494 },
  { address: '重庆市渝中区解放碑', lat: 29.5519, lng: 106.5788 },
  { address: '南京市鼓楼区新街口', lat: 32.0603, lng: 118.7969 },
];

const COMMENTS = [
  '看起来太好吃了！', '这家店我去过，确实不错', '收藏了，下次去尝尝',
  '求地址！', '周末就去', '看起来很诱人', '价格怎么样？',
  '有没有推荐的菜？', '已经打卡了', '味道正宗吗？',
  '排队的人多吗？', '准备去', '谢谢分享', '馋死了',
  '必须去试试', '看起来不错', 'mark一下', '太香了',
];

const BIOS = [
  '美食爱好者', '吃遍全国', '街头美食探索者', '美食达人', '吃货一枚',
  '无辣不欢', '甜品控', '海鲜爱好者', '素食主义者', '肉食动物',
];

interface Address {
  address: string;
  lat: number;
  lng: number;
}

interface User {
  id: number;
  username: string;
  email: string;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPicks<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function main() {
  console.log('开始生成大量测试数据...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  // 获取现有等级
  const level1 = await prisma.level.findUnique({ where: { level: 1 } });
  if (!level1) {
    console.log('等级数据未初始化，请先运行 seed.ts');
    return;
  }

  // 创建 20 个测试用户
  const users: User[] = [];
  for (let i = 1; i <= 20; i++) {
    const email = `test_user_${i}@example.com`;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      users.push(existing);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        username: `foodie_${String(i).padStart(3, '0')}`,
        email,
        password: hashedPassword,
        bio: randomPick(BIOS),
      },
    });

    // 初始化用户等级
    const userLevel = await prisma.userLevel.create({
      data: {
        userId: user.id,
        levelId: level1.id,
        exp: Math.floor(Math.random() * 100),
      },
    });

    // 初始化普通任务进度
    const tasks = await prisma.levelTask.findMany({ where: { isDaily: false } });
    for (const task of tasks) {
      await prisma.userLevelProgress.create({
        data: {
          userLevelId: userLevel.id,
          levelTaskId: task.id,
          currentCount: Math.floor(Math.random() * task.targetCount),
          completed: false,
        },
      });
    }

    users.push(user);
    console.log(`创建用户: ${user.username}`);
  }

  if (users.length < 2) {
    console.log('需要至少2个用户');
    return;
  }

  // 每个用户创建 10 条动态
  const allPosts: { id: number; userId: number }[] = [];
  let postCount = 0;

  for (const user of users) {
    for (let j = 1; j <= 10; j++) {
      const location: Address = randomPick(ADDRESSES);
      const foods = randomPicks(FOOD_ITEMS, 3);

      const post = await prisma.post.create({
        data: {
          userId: user.id,
          content: `今天在${location.address}发现了超级好吃的${foods.join('和')}！强烈推荐大家去尝尝！`,
          images: JSON.stringify([`/uploads/posts/sample${(postCount % 5) + 1}.jpg`]),
          address: location.address,
          latitude: location.lat + (Math.random() - 0.5) * 0.01,
          longitude: location.lng + (Math.random() - 0.5) * 0.01,
          likeCount: 0,
          favoriteCount: 0,
          commentCount: 0,
        },
      });

      allPosts.push({ id: post.id, userId: post.userId });
      postCount++;

      // 每条动态添加 2-5 条评论
      const commentCount = 2 + Math.floor(Math.random() * 4);
      const commenters = randomPicks(users.filter(u => u.id !== user.id), commentCount);
      let actualCommentCount = 0;

      for (const commenter of commenters) {
        try {
          await prisma.comment.create({
            data: {
              postId: post.id,
              userId: commenter.id,
              content: randomPick(COMMENTS),
              likeCount: Math.floor(Math.random() * 10),
            },
          });
          actualCommentCount++;
        } catch (e) {
          // 忽略错误
        }
      }

      // 更新评论数
      await prisma.post.update({
        where: { id: post.id },
        data: {
          commentCount: actualCommentCount,
          likeCount: Math.floor(Math.random() * 50),
          favoriteCount: Math.floor(Math.random() * 30),
        },
      });
    }
    console.log(`用户 ${user.username} 创建了 10 条动态`);
  }

  // 随机生成一些点赞和收藏关系
  for (const post of allPosts) {
    const otherUsers = users.filter(u => u.id !== post.userId);
    const likers = randomPicks(otherUsers, Math.floor(Math.random() * 10));
    for (const liker of likers) {
      try {
        await prisma.like.create({
          data: { userId: liker.id, postId: post.id },
        });
      } catch (e) {
        // 忽略重复
      }
    }

    const favorers = randomPicks(otherUsers, Math.floor(Math.random() * 5));
    for (const favorer of favorers) {
      try {
        await prisma.favorite.create({
          data: { userId: favorer.id, postId: post.id },
        });
      } catch (e) {
        // 忽略重复
      }
    }
  }

  // 创建一些关注关系
  for (const user of users) {
    const otherUsers = users.filter(u => u.id !== user.id);
    const followings = randomPicks(otherUsers, Math.floor(Math.random() * 5));
    for (const following of followings) {
      try {
        await prisma.follow.create({
          data: { followerId: user.id, followingId: following.id },
        });
      } catch (e) {
        // 忽略重复
      }
    }
  }

  console.log('\n=== 数据生成完成 ===');
  console.log(`用户数量: ${users.length}`);
  console.log(`动态数量: ${allPosts.length}`);
  console.log(`测试账号: test_user_1@example.com ~ test_user_20@example.com`);
  console.log(`密码: 123456`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
