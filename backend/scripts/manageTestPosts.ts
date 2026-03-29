import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 测试用的美食图片URL（使用公共图片资源）
const TEST_IMAGES = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800',
  'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
  'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800',
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
];

const TEST_CONTENTS = [
  '今天路过街角发现一家超棒的炒面摊！老板的手艺绝了，面条劲道，配菜新鲜，强烈推荐大家去试试！🍜',
  '深夜食堂的灵魂 - 烤串！这家小摊的羊肉串嫩而不膻，配上秘制辣椒面，简直绝了！🔥',
  '上海弄堂里的生煎包，外皮酥脆，内馅多汁，一口下去满嘴留香。这才是正宗的老上海味道！🥟',
  '北京的糖葫芦儿，酸甜适口，童年的味道。现在很少看到这么正宗的手工糖葫芦了！🍡',
  '成都的串串香，麻辣鲜香，几十种菜品随便选。和朋友们围坐在一起，边聊边吃，太惬意了！🌶️',
  '杭州的小笼包，皮薄馅大，汤汁丰富。配上一碗醋，简直是人间美味！🥟',
  '重庆的火锅，麻辣鲜香，牛油味十足。毛肚、鸭肠、黄喉，每一样都好吃到爆！🍲',
  '西安的肉夹馍，外酥里嫩，肉香浓郁。一个下去，满满的都是幸福感！🥙',
  '广州的早茶，虾饺、烧卖、叉烧包...每一样都精致美味。和家人一起叹早茶，是最幸福的时光！🍵',
  '长沙的臭豆腐，闻着臭吃着香，外酥里嫩，配上辣椒酱，简直是味蕾的狂欢！🧊',
  '南京的盐水鸭，皮白肉嫩，肥而不腻。作为南京的招牌美食，名不虚传！🦆',
  '苏州的松鼠桂鱼，酸甜可口，外酥里嫩。这道菜的颜值和味道都在线！🐟',
  '武汉的热干面，芝麻酱香浓，配上酸豆角和萝卜干，口感丰富，是武汉人的过早首选！🍝',
  '厦门的沙茶面，汤头浓郁，配料丰富。海鲜、豆腐、蔬菜，一碗下去营养满满！🍜',
  '兰州的牛肉面，汤清肉烂，面条劲道。一大碗下肚，浑身都暖和了！🍜',
];

const TEST_ADDRESSES = [
  '浙江省杭州市西湖区文三路',
  '上海市黄浦区南京东路',
  '北京市东城区王府井大街',
  '广东省广州市天河区天河路',
  '四川省成都市锦江区春熙路',
  '重庆市渝中区解放碑',
  '江苏省南京市秦淮区夫子庙',
  '陕西省西安市雁塔区大雁塔',
  '福建省厦门市思明区中山路',
  '湖南省长沙市天心区坡子街',
  '湖北省武汉市江岸区江汉路',
  '安徽省合肥市庐阳区淮河路',
  '河南省郑州市二七区二七广场',
  '山东省青岛市市南区台东路',
  '辽宁省沈阳市沈河区中街',
];

async function cleanBadPosts() {
  console.log('正在清理无法显示的测试动态...');

  // 删除没有图片或图片URL无效的动态
  const result = await prisma.post.deleteMany({
    where: {
      OR: [
        { images: { equals: '' } },
        { images: { equals: '[]' } },
        { images: { contains: 'invalid' } },
        { images: { contains: 'error' } },
        { images: { contains: 'localhost' } },
        { images: { contains: '127.0.0.1' } },
        { images: { contains: '/uploads/' } },
      ],
    },
  });

  console.log(`已删除 ${result.count} 条无效动态`);
}

async function createTestPosts() {
  console.log('正在创建测试动态...');

  // 获取第一个用户（作为发布者）
  const users = await prisma.user.findMany({ take: 1 });
  if (users.length === 0) {
    console.log('没有找到用户，请先创建用户');
    return;
  }

  const userId = users[0].id;

  // 创建15条测试动态
  for (let i = 0; i < 15; i++) {
    const randomImageIndex = Math.floor(Math.random() * TEST_IMAGES.length);
    const randomContentIndex = Math.floor(Math.random() * TEST_CONTENTS.length);
    const randomAddressIndex = Math.floor(Math.random() * TEST_ADDRESSES.length);

    await prisma.post.create({
      data: {
        content: TEST_CONTENTS[randomContentIndex],
        images: JSON.stringify([TEST_IMAGES[randomImageIndex]]),
        address: TEST_ADDRESSES[randomAddressIndex],
        userId: userId,
        isPrivate: false,
      },
    });

    console.log(`创建动态 ${i + 1}/15`);
  }

  console.log('测试动态创建完成！');
}

async function showPosts() {
  console.log('\n当前动态列表：');
  console.log('================\n');

  const posts = await prisma.post.findMany({
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  posts.forEach((post, index) => {
    console.log(`${index + 1}. ID: ${post.id}`);
    console.log(`   用户: ${post.user.username}`);
    console.log(`   内容: ${post.content.substring(0, 50)}...`);
    console.log(`   图片: ${post.images}`);
    console.log(`   地址: ${post.address || '无'}`);
    console.log(`   私密: ${post.isPrivate ? '是' : '否'}`);
    console.log('---');
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'clean':
        await cleanBadPosts();
        break;
      case 'create':
        await createTestPosts();
        break;
      case 'show':
        await showPosts();
        break;
      case 'reset':
        console.log('正在重置测试数据...');
        await cleanBadPosts();
        await createTestPosts();
        await showPosts();
        break;
      default:
        console.log('用法:');
        console.log('  npm run test-posts clean   - 清理无效动态');
        console.log('  npm run test-posts create  - 创建测试动态');
        console.log('  npm run test-posts show    - 显示当前动态');
        console.log('  npm run test-posts reset   - 重置测试数据（清理+创建）');
    }
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
