import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 测试图片列表（使用占位图）
const testImages = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800',
  'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800',
  'https://images.unsplash.com/photo-1496116218417-1a781b1c423c?w=800',
];

// 测试内容
const testContents = [
  '今天在这家小馆子发现了超级好吃的面条！汤底浓郁，面条劲道，配菜也很新鲜。强烈推荐大家来试试！',
  '街角的这家包子铺太赞了！皮薄馅大，一口咬下去汤汁四溢。每天早上都要来两个才满足。',
  '发现一家隐藏在巷子里的小店，老板手艺超好。这碗面让我想起了小时候妈妈做的味道，暖心又暖胃。',
  '午饭时间到！这家店的盖浇饭分量超足，味道也很正宗。价格实惠，是打工人的福音。',
  '深夜食堂系列！这家烧烤摊开到凌晨，烤串味道一流，配上冰啤酒简直是人生享受。',
  '路过这家甜品店被吸引进去了，芒果班戟超大一份，芒果新鲜甜糯，奶油不腻人。女生一定要来试试！',
  '这家的炸鸡外酥里嫩，辣度刚刚好，配上特制蘸料简直完美。追剧必备零食！',
  '早晨来一碗热腾腾的粥配小菜，整个人都暖和了。这家店的粥熬得很浓稠，料也足。',
  '终于找到这家传说中的臭豆腐了！闻着臭吃着香，外酥里嫩，配上特制辣椒酱绝了。',
  '网红打卡店来报道！不仅颜值高，味道也没得说。拍照发朋友圈赞爆了！',
];

// 测试地址（不同城市）
const testAddresses = [
  '浙江省杭州市西湖区文三路 123 号',
  '浙江省杭州市西湖区龙井路 45 号',
  '浙江省杭州市上城区解放路 88 号',
  '浙江省杭州市拱墅区大关路 67 号',
  '上海市黄浦区南京东路 234 号',
  '上海市徐汇区淮海中路 567 号',
  '上海市静安区南京西路 890 号',
  '上海市浦东新区陆家嘴环路 111 号',
  '北京市朝阳区三里屯路 333 号',
  '北京市东城区王府井大街 444 号',
  '北京市海淀区中关村大街 555 号',
  '北京市西城区西单北大街 666 号',
  '广东省广州市天河区天河路 777 号',
  '广东省广州市越秀区北京路 888 号',
  '广东省深圳市福田区华强北路 999 号',
  '四川省成都市锦江区春熙路 101 号',
  '四川省成都市武侯区人民南路 202 号',
  '湖北省武汉市江汉区江汉路 303 号',
  '陕西省西安市雁塔区小寨路 404 号',
  '江苏省南京市玄武区中山路 505 号',
];

async function createTestPosts() {
  console.log('开始创建测试动态...');

  // 获取或创建测试用户
  let testUser = await prisma.user.findFirst({
    where: { username: '美食家小明' }
  });

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        username: '美食家小明',
        email: 'foodie@example.com',
        password: 'password123', // 实际使用时应该加密
        bio: '热爱美食，喜欢探索街边小吃',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=foodie'
      }
    });
    console.log('创建测试用户:', testUser.username);
  }

  // 创建 50 条测试动态
  const postsToCreate = 50;
  let createdCount = 0;

  for (let i = 0; i < postsToCreate; i++) {
    // 随机选择 1-3 张图片
    const imageCount = Math.floor(Math.random() * 3) + 1;
    const images: string[] = [];
    for (let j = 0; j < imageCount; j++) {
      const randomImageIndex = Math.floor(Math.random() * testImages.length);
      images.push(testImages[randomImageIndex]);
    }

    // 随机选择内容和地址
    const content = testContents[Math.floor(Math.random() * testContents.length)];
    const address = testAddresses[Math.floor(Math.random() * testAddresses.length)];

    try {
      await prisma.post.create({
        data: {
          content: `${content} (${i + 1})`, // 添加序号以便区分
          images: JSON.stringify(images),
          address: address,
          userId: testUser.id,
        }
      });
      createdCount++;
      console.log(`创建动态 ${createdCount}/${postsToCreate}`);
    } catch (error) {
      console.error(`创建动态 ${i + 1} 失败:`, error);
    }
  }

  console.log(`\n完成！共创建 ${createdCount} 条测试动态`);

  // 显示统计信息
  const totalPosts = await prisma.post.count();
  console.log(`数据库中总共有 ${totalPosts} 条动态`);
}

createTestPosts()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
