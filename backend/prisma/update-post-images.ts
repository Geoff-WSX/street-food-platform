import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 美食图片映射（使用 Picsum 随机图片，实际项目中应该用真实美食图片）
const FOOD_IMAGES: Record<string, string[]> = {
  '煎饼果子': ['https://images.unsplash.com/photo-1555126634-323283e090fa?w=800', 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800'],
  '烤冷面': ['https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800', 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800'],
  '臭豆腐': ['https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800', 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800'],
  '烤红薯': ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800'],
  '糖葫芦': ['https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=800', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800'],
  '肉夹馍': ['https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800', 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=800'],
  '鸡蛋灌饼': ['https://images.unsplash.com/photo-1567337710282-00832b415979?w=800', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
  '手抓饼': ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=800'],
  '炸鸡排': ['https://images.unsplash.com/photo-1562967914-608f82629710?w=800', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800'],
  '奶茶': ['https://images.unsplash.com/photo-1558857563-b371033873b8?w=800', 'https://images.unsplash.com/photo-1587080413959-06b859fb107d?w=800'],
  '小龙虾': ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', 'https://images.unsplash.com/photo-1559847844-5315695d6e6c?w=800'],
  '火锅': ['https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800', 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=800'],
  '烧烤': ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800'],
  '串串': ['https://images.unsplash.com/photo-1544025162-d76694265947?w=800', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800'],
  '麻辣烫': ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800'],
  '凉皮': ['https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=800', 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800'],
  '热干面': ['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800'],
  '包子': ['https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800', 'https://images.unsplash.com/photo-1559847844-5315695d6e6c?w=800'],
  '油条': ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', 'https://images.unsplash.com/photo-1585443395204-8e83e7cea9b6?w=800'],
  '豆浆': ['https://images.unsplash.com/photo-1557838923-2985c318be48?w=800', 'https://images.unsplash.com/photo-1495476479092-6ece1898a9a8?w=800'],
  '豆腐脑': ['https://images.unsplash.com/photo-1547592180-85f173990554?w=800', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800'],
  '煎饺': ['https://images.unsplash.com/photo-1495925563344-5cf3a3b6f37d?w=800', 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800'],
  '锅贴': ['https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800', 'https://images.unsplash.com/photo-1495925563344-5cf3a3b6f37d?w=800'],
  '生煎': ['https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800', 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800'],
  '小笼包': ['https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800', 'https://images.unsplash.com/photo-1495925563344-5cf3a3b6f37d?w=800'],
  '馄饨': ['https://images.unsplash.com/photo-1565703129866-f37c5de03d28?w=800', 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800'],
  '刀削面': ['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800'],
  '拉面': ['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800', 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800'],
  '烩面': ['https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800'],
  '凉面': ['https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=800', 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800'],
  '冷面': ['https://images.unsplash.com/photo-1567337710282-00832b415979?w=800', 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=800'],
  '螺蛳粉': ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800'],
  '肠粉': ['https://images.unsplash.com/photo-1567337710282-00832b415979?w=800', 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800'],
  '叉烧饭': ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800'],
  '煲仔饭': ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800'],
};

// 默认图片（当没有匹配时使用）
const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
  'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800',
  'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800',
  'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800',
];

function getFoodFromContent(content: string): string | null {
  for (const food of Object.keys(FOOD_IMAGES)) {
    if (content.includes(food)) {
      return food;
    }
  }
  return null;
}

function getRandomImage(food: string | null, index: number): string[] {
  let images: string[];

  if (food && FOOD_IMAGES[food]) {
    images = FOOD_IMAGES[food];
  } else {
    images = DEFAULT_IMAGES;
  }

  // 根据索引选择图片，每条动态用1-2张图片
  const imageCount = index % 3 === 0 ? 2 : 1;
  const selectedImages: string[] = [];

  for (let i = 0; i < imageCount; i++) {
    const imgIndex = (index + i) % images.length;
    selectedImages.push(images[imgIndex]);
  }

  return selectedImages;
}

async function main() {
  console.log('开始更新动态图片...\n');

  const posts = await prisma.post.findMany({
    orderBy: { id: 'asc' },
  });

  let updated = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const food = getFoodFromContent(post.content);
    const images = getRandomImage(food, i);

    await prisma.post.update({
      where: { id: post.id },
      data: {
        images: JSON.stringify(images),
      },
    });

    updated++;
    if (updated % 50 === 0) {
      console.log(`已更新 ${updated}/${posts.length} 条动态`);
    }
  }

  console.log(`\n=== 完成 ===`);
  console.log(`共更新 ${updated} 条动态`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
