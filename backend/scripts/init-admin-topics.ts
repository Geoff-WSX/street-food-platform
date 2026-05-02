import prisma from '../src/services/db/prisma';
import bcrypt from 'bcrypt';

async function createSuperAdmin() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const user = await prisma.user.upsert({
    where: { email: 'wsx@qq.com' },
    update: {},
    create: {
      email: 'wsx@qq.com',
      username: '超级管理员',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
      bio: '系统超级管理员',
    },
  });

  // 初始化用户等级
  await prisma.userLevel.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      levelId: 6, // 最高等级
      exp: 9999,
    },
  });

  console.log('✅ 超级管理员创建成功:', user.email, '角色:', user.role);
  return user;
}

async function createTopics() {
  const topics = [
    '川菜', '粤菜', '湘菜', '鲁菜', '苏菜', '浙菜', '闽菜', '徽菜', '京菜', '津菜',
    '火锅', '烧烤', '小龙虾', '烤肉', '串串', '麻辣烫', '冒菜', '酸菜鱼', '水煮鱼', '烤鱼',
    '早餐', '午餐', '晚餐', '夜宵', '下午茶', '甜品', '饮品', '小吃', '快餐', '自助餐',
    '面食', '米线', '米粉', '馄饨', '饺子', '包子', '馒头', '烙饼', '煎饼', '豆腐脑',
    '奶茶', '咖啡', '果汁', '酸奶', '冰淇淋', '蛋糕', '面包', '饼干', '巧克力', '糖果',
    '水果', '坚果', '零食', '海鲜', '肉类', '蔬菜', '菌菇', '豆制品', '蛋类', '内脏',
    '街头美食', '网红店', '老字号', '私房菜', '家常菜', '下饭菜', '开胃菜', '凉菜', '热菜', '汤羹',
    '日料', '韩料', '西餐', '东南亚菜', '印度菜', '泰国菜', '越南菜', '法国菜', '意大利菜', '美国菜',
    '健康餐', '轻食', '沙拉', '减脂餐', '增肌餐', '素食', '有机食品', '无麸质', '低糖', '低脂',
    '美食探店', '美食分享', '食谱分享', '厨房技巧', '食材选购', '美食文化', '饮食健康', '美食摄影', '美食旅行', '美食故事'
  ];

  console.log('开始创建话题...');

  for (let i = 0; i < topics.length; i++) {
    const topicName = topics[i];
    const existingTopic = await prisma.tag.findFirst({
      where: { name: topicName }
    });

    if (!existingTopic) {
      await prisma.tag.create({
        data: {
          name: topicName,
        },
      });
      console.log(`  创建话题: ${topicName}`);
    } else {
      console.log(`  话题已存在: ${topicName}`);
    }
  }

  console.log(`✅ 话题创建完成，共 ${topics.length} 个话题`);
}

async function main() {
  try {
    console.log('开始数据初始化...\n');

    await createSuperAdmin();
    console.log('');
    await createTopics();

    console.log('\n✅ 所有数据初始化完成');
  } catch (error) {
    console.error('初始化失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
