import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// 测试用户数据
const testUsers = [
  { username: '美食猎人小王', email: 'wang@test.com', password: 'test123', bio: '资深吃货，走遍大街小巷寻找美食', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang' },
  { username: '辣妹子李梅', email: 'li@test.com', password: 'test123', bio: '四川妹子，无辣不欢', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li' },
  { username: '北京吃货张三', email: 'zhang@test.com', password: 'test123', bio: '老北京，专攻胡同小吃', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang' },
  { username: '广州美食家', email: 'guang@test.com', password: 'test123', bio: '食在广州，寻找最正宗的粤菜', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guang' },
  { username: '上海弄堂味', email: 'shanghai@test.com', password: 'test123', bio: '上海本帮菜爱好者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shanghai' },
  { username: '西安肉夹馍', email: 'xian@test.com', password: 'test123', bio: '三秦大地美食探索者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xian' },
  { username: '成都串串香', email: 'chengdu@test.com', password: 'test123', bio: '火锅串串人生', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chengdu' },
  { username: '南京盐水鸭', email: 'nanjing@test.com', password: 'test123', bio: '金陵美食推荐官', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nanjing' },
  { username: '杭州西湖味', email: 'hangzhou@test.com', password: 'test123', bio: '杭帮菜粉丝', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hangzhou' },
  { username: '重庆小面', email: 'chongqing@test.com', password: 'test123', bio: '山城美食猎人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chongqing' },
];

// 测试动态数据
const testPosts = [
  // 北京地区
  {
    userId: 3, // 北京吃货张三
    content: '🔥 发现一家藏在胡同里的老北京炸酱面！手擀面条劲道，炸酱香浓，配上黄瓜丝和豆芽，绝了！就在南锣鼓巷旁边的小胡同里，中午11点去排队的人超多。',
    images: JSON.stringify(['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800', 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800']),
    address: '北京市-北京市-东城区',
    latitude: 39.9163,
    longitude: 116.4074,
    likeCount: 128,
    favoriteCount: 56,
  },
  {
    userId: 3,
    content: '🥟 簋街小吃街的豆汁儿配焦圈，老北京的经典早餐！第一次喝可能不习惯，但越喝越上瘾。配上咸菜丝和辣椒油，绝配！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800']),
    address: '北京市-北京市-东城区',
    latitude: 39.9443,
    longitude: 116.4247,
    likeCount: 89,
    favoriteCount: 34,
  },
  {
    userId: 3,
    content: '🦆 全聚德烤鸭，皮脆肉嫩，蘸酱配薄饼卷葱丝，一口下去满嘴香！虽然价格不便宜，但偶尔犒劳一下自己还是很值得的。',
    images: JSON.stringify(['https://images.unsplash.com/photo-1544025162-d76694265947?w=800', 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800']),
    address: '北京市-北京市-朝阳区',
    latitude: 39.9219,
    longitude: 116.4434,
    likeCount: 234,
    favoriteCount: 123,
  },

  // 上海地区
  {
    userId: 5, // 上海弄堂味
    content: '🥟 南翔小笼包，皮薄汁多！轻轻一咬，汤汁四溢，肉馅鲜美。一定要配醋姜丝，味道绝了！排队1小时值得。',
    images: JSON.stringify(['https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800']),
    address: '上海市-上海市-嘉定区',
    latitude: 31.2827,
    longitude: 121.2580,
    likeCount: 156,
    favoriteCount: 78,
  },
  {
    userId: 5,
    content: '🍜 上海葱油拌面，葱香浓郁，面条劲道。看似简单却很有讲究，葱要用小葱，油要用猪油，面条要手擀。这家老店做了30年，味道正宗！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800']),
    address: '上海市-上海市-黄浦区',
    latitude: 31.2317,
    longitude: 121.4737,
    likeCount: 98,
    favoriteCount: 45,
  },
  {
    userId: 5,
    content: '🦀 阳澄湖大闸蟹，蟹黄饱满，蟹肉鲜甜！九月圆脐十月尖，现在正是吃蟹的好时节。清蒸配姜醋，原汁原味。',
    images: JSON.stringify(['https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800']),
    address: '上海市-上海市-青浦区',
    latitude: 31.1434,
    longitude: 120.9892,
    likeCount: 312,
    favoriteCount: 189,
  },

  // 广州地区
  {
    userId: 4, // 广州美食家
    content: '🥟 广州早茶文化，叹茶一盅两件！虾饺、烧卖、叉烧包、凤爪、排骨...每一样都精致美味。这家百年老茶楼，3点开门，7点就排队了！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800', 'https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800']),
    address: '广东省-广州市-荔湾区',
    latitude: 23.1298,
    longitude: 113.2373,
    likeCount: 267,
    favoriteCount: 134,
  },
  {
    userId: 4,
    content: '🍜 广式云吞面，云吞皮薄馅大，面条竹升面口感弹牙。汤底用大地鱼、虾籽熬制，鲜掉眉毛！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1555126634-323283e090fa?w=800']),
    address: '广东省-广州市-越秀区',
    latitude: 23.1379,
    longitude: 113.2670,
    likeCount: 145,
    favoriteCount: 67,
  },
  {
    userId: 4,
    content: '🦆 广式烧腊，烧鸭皮脆肉嫩，叉烧肥瘦相间！配上酸梅酱，开胃解腻。这家店做了40年，老街坊都爱吃。',
    images: JSON.stringify(['https://images.unsplash.com/photo-1544025162-d76694265947?w=800', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800']),
    address: '广东省-广州市-海珠区',
    latitude: 23.0846,
    longitude: 113.3191,
    likeCount: 178,
    favoriteCount: 89,
  },

  // 成都地区
  {
    userId: 7, // 成都串串香
    content: '🌶️ 成都火锅串串，麻辣鲜香！毛肚、鸭肠、黄喉、脑花...想吃什么串什么。这家巷子里的老店，用的都是当天采购的新鲜食材。',
    images: JSON.stringify(['https://images.unsplash.com/photo-1553621042-f6e147245754?w=800', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800']),
    address: '四川省-成都市-锦江区',
    latitude: 30.6586,
    longitude: 104.0648,
    likeCount: 345,
    favoriteCount: 201,
  },
  {
    userId: 7,
    content: '🍜 成都担担面，麻辣鲜香，面条劲道。肉臊炒得香喷喷，配上花椒面和红油，一口下去满足感爆棚！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1555126634-323283e090fa?w=800', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800']),
    address: '四川省-成都市-青羊区',
    latitude: 30.6719,
    longitude: 104.0459,
    likeCount: 167,
    favoriteCount: 92,
  },
  {
    userId: 7,
    content: '🐔 成都夫妻肺片，麻辣鲜香，牛杂处理得很干净，红油香而不腻。配上一碗白米饭，绝了！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1544025162-d76694265947?w=800']),
    address: '四川省-成都市-武侯区',
    latitude: 30.6429,
    longitude: 104.0433,
    likeCount: 134,
    favoriteCount: 76,
  },

  // 西安地区
  {
    userId: 6, // 西安肉夹馍
    content: '🥙 西安肉夹馍，肥而不腻，瘦而不柴！馍要打好的白吉馍，肉要用腊汁肉。这家老字号，每天早上6点开始炖肉，香味飘三条街！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1544025162-d76694265947?w=800', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800']),
    address: '陕西省-西安市-碑林区',
    latitude: 34.2570,
    longitude: 108.9480,
    likeCount: 223,
    favoriteCount: 112,
  },
  {
    userId: 6,
    content: '🍜 西安羊肉泡馍，汤鲜肉烂，馍香肉香！自己掰馍才有感觉，掰得越碎越入味。配上糖蒜和辣酱，完美！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1555126634-323283e090fa?w=800', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800']),
    address: '陕西省-西安市-莲湖区',
    latitude: 34.2673,
    longitude: 108.9390,
    likeCount: 189,
    favoriteCount: 98,
  },
  {
    userId: 6,
    content: '🥟 西安回民街小吃，酸汤水饺、灌汤包、肉丸胡辣汤...每一样都想尝！人很多但值得排队。',
    images: JSON.stringify(['https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800', 'https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800']),
    address: '陕西省-西安市-新城区',
    latitude: 34.2658,
    longitude: 108.9540,
    likeCount: 278,
    favoriteCount: 145,
  },

  // 重庆地区
  {
    userId: 10, // 重庆小面
    content: '🌶️ 重庆小面，麻辣鲜香！面条要碱水面，调料要十几种。这家藏在居民楼下的面馆，老板是重庆土著，做了20年！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1555126634-323283e090fa?w=800', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800']),
    address: '重庆市-重庆市-渝中区',
    latitude: 29.5583,
    longitude: 106.5079,
    likeCount: 156,
    favoriteCount: 87,
  },
  {
    userId: 10,
    content: '🍲 重庆火锅，九宫格标配！毛肚、黄喉、鸭肠、脑花、鸭血...麻辣锅底越煮越香。一定要点酥肉，炸得酥酥的！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1553621042-f6e147245754?w=800', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800']),
    address: '重庆市-重庆市-江北区',
    latitude: 29.5677,
    longitude: 106.5319,
    likeCount: 289,
    favoriteCount: 167,
  },
  {
    userId: 10,
    content: '🐟 重庆酸菜鱼，酸辣开胃，鱼肉鲜嫩！酸菜是老板自己腌制的，酸爽可口。配上白米饭，我能吃三碗！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800']),
    address: '重庆市-重庆市-南岸区',
    latitude: 29.5242,
    longitude: 106.5558,
    likeCount: 134,
    favoriteCount: 78,
  },

  // 南京地区
  {
    userId: 8, // 南京盐水鸭
    content: '🦆 南京盐水鸭，皮白肉嫩，肥而不腻！鸭肉用盐水腌制，肉质紧实。这家百年老店，每天限量供应，去晚了就没了。',
    images: JSON.stringify(['https://images.unsplash.com/photo-1544025162-d76694265947?w=800', 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800']),
    address: '江苏省-南京市-秦淮区',
    latitude: 32.0584,
    longitude: 118.7965,
    likeCount: 178,
    favoriteCount: 89,
  },
  {
    userId: 8,
    content: '🥟 南京鸭血粉丝汤，鸭血鲜嫩，粉丝顺滑！配上豆腐果、鸭肝、鸭肠，一碗下肚浑身暖洋洋。',
    images: JSON.stringify(['https://images.unsplash.com/photo-1555126634-323283e090fa?w=800']),
    address: '江苏省-南京市-鼓楼区',
    latitude: 32.0617,
    longitude: 118.7778,
    likeCount: 145,
    favoriteCount: 67,
  },
  {
    userId: 8,
    content: '🍖 南京夫子庙小吃，梅花糕、赤豆元宵、糖芋苗...甜而不腻，老少皆宜。晚上去灯光美，更有氛围！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800']),
    address: '江苏省-南京市-玄武区',
    latitude: 32.0603,
    longitude: 118.7969,
    likeCount: 201,
    favoriteCount: 112,
  },

  // 杭州地区
  {
    userId: 9, // 杭州西湖味
    content: '🍜 杭州片儿川，面条筋道，浇头鲜美！雪菜、笋片、肉丝，简单却很有味道。这家面馆在西湖边，风景好味道更好！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1555126634-323283e090fa?w=800']),
    address: '浙江省-杭州市-西湖区',
    latitude: 30.2591,
    longitude: 120.1291,
    likeCount: 134,
    favoriteCount: 67,
  },
  {
    userId: 9,
    content: '🐟 西湖醋鱼，酸甜可口！鱼肉鲜嫩，糖醋汁浓郁。选用的是西湖草鱼，现点现杀，保证新鲜。',
    images: JSON.stringify(['https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800', 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800']),
    address: '浙江省-杭州市-上城区',
    latitude: 30.2416,
    longitude: 120.1700,
    likeCount: 189,
    favoriteCount: 98,
  },
  {
    userId: 9,
    content: '🥟 杭州小笼包，皮薄汁多！和南翔小笼包不同，杭州的更甜一些，馅料里加了糖。配上一碗醋姜丝，绝配！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800', 'https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800']),
    address: '浙江省-杭州市-拱墅区',
    latitude: 30.3183,
    longitude: 120.1425,
    likeCount: 156,
    favoriteCount: 78,
  },

  // 四川地区（辣妹子李梅）
  {
    userId: 2, // 辣妹子李梅
    content: '🌶️ 四川麻辣烫，想吃什么烫什么！蔬菜、肉类、豆制品、主食...二十多种调料自己调。这家店开了15年，我是从小吃到大。',
    images: JSON.stringify(['https://images.unsplash.com/photo-1553621042-f6e147245754?w=800', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800']),
    address: '四川省-成都市-武侯区',
    latitude: 30.6429,
    longitude: 104.0433,
    likeCount: 178,
    favoriteCount: 89,
  },
  {
    userId: 2,
    content: '🐔 四川口水鸡，麻辣鲜香！鸡肉嫩滑，红油香浓，花椒麻得过瘾。夏天吃这个特别开胃！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1544025162-d76694265947?w=800']),
    address: '四川省-成都市-锦江区',
    latitude: 30.6586,
    longitude: 104.0648,
    likeCount: 145,
    favoriteCount: 67,
  },

  // 通用美食分享
  {
    userId: 1, // 美食猎人小王
    content: '🍜 今天来分享一家超赞的面馆！老板是山西人，刀削面一绝。面条外滑内筋，配上红烧肉卤，再来瓣大蒜，美滋滋！人均只要20元，性价比超高！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1555126634-323283e090fa?w=800', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800']),
    address: '北京市-北京市-朝阳区',
    latitude: 39.9219,
    longitude: 116.4434,
    likeCount: 234,
    favoriteCount: 123,
  },
  {
    userId: 1,
    content: '🥟 饺子馆推荐！这家东北饺子馆，饺子都是现包的，皮薄馅大。猪肉白菜、韭菜鸡蛋、三鲜...我最爱酸菜猪肉，配上蒜酱和醋，绝了！',
    images: JSON.stringify(['https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800']),
    address: '北京市-北京市-海淀区',
    latitude: 39.9591,
    longitude: 116.2984,
    likeCount: 189,
    favoriteCount: 98,
  },
  {
    userId: 1,
    content: '🍖 烧烤店推荐！这家新疆烧烤，羊肉串鲜嫩多汁，烤得外焦里嫩。配上馕和格瓦斯，仿佛到了大西北！老板是新疆人，很热情。',
    images: JSON.stringify(['https://images.unsplash.com/photo-1544025162-d76694265947?w=800', 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800']),
    address: '北京市-北京市-丰台区',
    latitude: 39.8585,
    longitude: 116.2869,
    likeCount: 267,
    favoriteCount: 134,
  },
];

async function main() {
  console.log('🔄 开始清理旧数据...');

  // 删除所有旧数据
  await prisma.like.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.follow.deleteMany({});
  await prisma.notification.deleteMany({});

  // 删除除管理员外的所有用户
  await prisma.user.deleteMany({
    where: {
      role: 'user',
    },
  });

  console.log('✅ 旧数据清理完成');

  console.log('👥 开始创建测试用户...');

  // 创建测试用户
  const hashedPassword = await bcrypt.hash('test123', 10);
  const createdUsers = [];

  for (const userData of testUsers) {
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
    });
    createdUsers.push(user);
    console.log(`✅ 创建用户: ${user.username} (ID: ${user.id})`);
  }

  console.log(`✅ 测试用户创建完成，共 ${createdUsers.length} 个`);

  // 创建用户ID映射
  const userMap: Record<number, number> = {};
  createdUsers.forEach((user, index) => {
    userMap[index + 1] = user.id;
  });

  console.log('📝 开始创建测试动态...');

  // 创建测试动态，映射 userId
  for (const postData of testPosts) {
    const actualUserId = userMap[postData.userId];
    if (!actualUserId) {
      console.log(`⚠️  跳过动态: 找不到用户ID ${postData.userId}`);
      continue;
    }

    const post = await prisma.post.create({
      data: {
        ...postData,
        userId: actualUserId,
      },
    });
    console.log(`✅ 创建动态: ${post.content.substring(0, 20)}...`);
  }

  console.log(`✅ 测试动态创建完成，共 ${testPosts.length} 个`);

  // 创建一些关注关系
  console.log('👥 创建关注关系...');
  const followRelations = [
    { followerId: 1, followingId: 2 },
    { followerId: 1, followingId: 3 },
    { followerId: 1, followingId: 4 },
    { followerId: 2, followingId: 1 },
    { followerId: 2, followingId: 7 },
    { followerId: 3, followingId: 1 },
    { followerId: 3, followingId: 5 },
    { followerId: 4, followingId: 7 },
    { followerId: 5, followingId: 4 },
    { followerId: 6, followingId: 10 },
    { followerId: 7, followingId: 2 },
    { followerId: 7, followingId: 6 },
    { followerId: 8, followingId: 9 },
    { followerId: 9, followingId: 5 },
    { followerId: 10, followingId: 7 },
  ].map(rel => ({
    followerId: userMap[rel.followerId],
    followingId: userMap[rel.followingId],
  }));

  await prisma.follow.createMany({
    data: followRelations,
  });
  console.log('✅ 关注关系创建完成');

  console.log('🎉 测试数据创建完成！');
  console.log('\n📋 测试账号信息:');
  console.log('邮箱: wang@test.com ~ chongqing@test.com');
  console.log('密码: test123');
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
