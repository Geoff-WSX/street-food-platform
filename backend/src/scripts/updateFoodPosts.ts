/**
 * 批量更新测试动态为美食相关内容
 * 运行: npx ts-node src/scripts/updateFoodPosts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 美食动态数据
const foodPosts = [
  // 北京美食
  { content: '🔥北京烤鸭必吃店！这家店的烤鸭皮脆肉嫩，配上薄饼和甜面酱简直绝了！强烈推荐给大家！', images: '["https://images.unsplash.com/photo-1518492104633-130e0e1e3bb7?w=800","https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800"]', address: '北京市-东城区-王府井大街', latitude: 39.9163, longitude: 116.4101 },
  { content: '🍜老北京炸酱面，酱香浓郁，面条劲道！这家店开了20多年，味道依然正宗！', images: '["https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800"]', address: '北京市-西城区-护国寺街', latitude: 39.9324, longitude: 116.3726 },
  { content: '🥟南锣鼓巷的蟹黄小笼包，汤汁鲜美，一口一个根本停不下来！', images: '["https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800","https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '北京市-东城区-南锣鼓巷', latitude: 39.9339, longitude: 116.4034 },
  { content: '🍲簋街深夜食堂！麻辣小龙虾配啤酒，这才是夏天的正确打开方式！', images: '["https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800","https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800"]', address: '北京市-东城区-簋街', latitude: 39.9355, longitude: 116.4185 },
  { content: '🥗北京胡同里的豆汁焦圈套餐，地道北京早餐，感受老北京的味道！', images: '["https://images.unsplash.com/photo-1547592180-85f173990554?w=800"]', address: '北京市-东城区-前门大街', latitude: 39.8963, longitude: 116.3972 },

  // 上海美食
  { content: '🍜本帮红烧肉，肥而不腻，入口即化！这家店的本帮菜超正宗！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800","https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800"]', address: '上海市-黄浦区-进贤路', latitude: 31.2229, longitude: 121.4653 },
  { content: '🥟上海小笼包，鲜美多汁，咬一口汤汁四溢！城隍庙必吃！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '上海市-黄浦区-城隍庙', latitude: 31.2286, longitude: 121.4712 },
  { content: '🦐避风塘炒蟹，蒜香浓郁超级好吃！这道菜简直是下饭神器！', images: '["https://images.unsplash.com/photo-1559337558-2f5a35f4523b?w=800","https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800"]', address: '上海市-静安区-吴江路', latitude: 31.2280, longitude: 121.4590 },
  { content: '🍝上海老吉士的蟹粉年糕，软糯入味，每一口都是幸福的味道！', images: '["https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800"]', address: '上海市-徐汇区-天平路', latitude: 31.2090, longitude: 121.4470 },
  { content: '🥤上海传统刨冰，清凉解暑！老字号的味道就是不一样！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '上海市-虹口区-鲁迅公园', latitude: 31.2590, longitude: 121.4850 },

  // 杭州美食
  { content: '🍽️西湖醋鱼，西湖边的招牌菜！酸甜适中，鱼肉鲜嫩，必点！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800","https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800"]', address: '杭州市-西湖区-南山路', latitude: 30.2420, longitude: 120.1480 },
  { content: '🦐龙井虾仁，清香四溢！来杭州必吃的经典杭帮菜！', images: '["https://images.unsplash.com/photo-1559337558-2f5a35f4523b?w=800"]', address: '杭州市-西湖区-龙井路', latitude: 30.2510, longitude: 120.1320 },
  { content: '🍜片儿川，杭州人最爱的面食！笋片肉丝雪菜，汤鲜面滑！', images: '["https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800"]', address: '杭州市-上城区-河坊街', latitude: 30.2460, longitude: 120.1590 },
  { content: '🥟知味观的鲜肉小笼包，杭州人的早餐记忆！皮薄馅大汤多！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '杭州市-下城区-仁和路', latitude: 30.2580, longitude: 120.1710 },
  { content: '🍵灵隐寺附近的素斋，清淡养生，环境清幽，强烈推荐！', images: '["https://images.unsplash.com/photo-1547592180-85f173990554?w=800","https://images.unsplash.com/photo-1544025162-d76694265947?w=800"]', address: '杭州市-西湖区-灵隐路', latitude: 30.2370, longitude: 120.0860 },

  // 成都美食
  { content: '🔥成都火锅串串香，麻辣鲜香！这家店的自助串串太划算了！', images: '["https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800","https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800"]', address: '成都市-锦江区-春熙路', latitude: 30.6580, longitude: 104.0840 },
  { content: '🍜担担面，红油浇头香气扑鼻！这才是正宗的成都味道！', images: '["https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800"]', address: '成都市-青羊区-宽窄巷子', latitude: 30.6700, longitude: 104.0560 },
  { content: '🐼成都熊猫基地旁边的农家乐，特色川菜味道绝了！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800","https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800"]', address: '成都市-成华区-熊猫大道', latitude: 30.7400, longitude: 104.1450 },
  { content: '🥘老妈蹄花，软糯入味的猪蹄配上山药，汤鲜肉美！', images: '["https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800"]', address: '成都市-武侯区-玉林路', latitude: 30.6380, longitude: 104.0650 },
  { content: '🍢成都烤鱼，外焦里嫩，麻辣过瘾！宵夜首选！', images: '["https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800"]', address: '成都市-锦江区-九眼桥', latitude: 30.6320, longitude: 104.0960 },

  // 重庆美食
  { content: '🔥重庆老火锅，九宫格红油锅底，辣到飞起！毛肚鸭肠必点！', images: '["https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800","https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800"]', address: '重庆市-渝中区-解放碑', latitude: 29.5590, longitude: 106.5780 },
  { content: '🍜重庆小面，麻辣鲜香！早上吃一碗一天都有精神！', images: '["https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800"]', address: '重庆市-渝中区-磁器口', latitude: 29.5790, longitude: 106.4490 },
  { content: '🐟酸菜鱼，鱼肉嫩滑，酸辣开胃！这道菜太下饭了！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800"]', address: '重庆市-江北区-观音桥', latitude: 29.5780, longitude: 106.5400 },
  { content: '🥔重庆鸡公煲，鸡肉入味配菜丰富，一锅吃撑！', images: '["https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800"]', address: '重庆市-南岸区-南坪', latitude: 29.5380, longitude: 106.5650 },
  { content: '🍢烤脑花，重庆烧烤摊的灵魂美食！入口即化超级香！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '重庆市-沙坪坝区-三峡广场', latitude: 29.5430, longitude: 106.4580 },

  // 广州美食
  { content: '🥟广州早茶，点都德的虾饺皇和凤爪太绝了！一盅两件超满足！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800","https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800"]', address: '广州市-越秀区-沿江路', latitude: 23.1210, longitude: 113.3220 },
  { content: '🍜竹升面，广州传统面食！汤底鲜美面条劲道！', images: '["https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800"]', address: '广州市-荔湾区-上下九', latitude: 23.1190, longitude: 113.3140 },
  { content: '🦐白灼虾，原汁原味！配上姜葱酱料简直完美！', images: '["https://images.unsplash.com/photo-1559337558-2f5a35f4523b?w=800"]', address: '广州市-海珠区-沙园市场', latitude: 23.0850, longitude: 113.2600 },
  { content: '🥘广式煲仔饭，腊味飘香，锅巴焦脆！这才是米饭最香的吃法！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800"]', address: '广州市-天河区-体育西路', latitude: 23.1460, longitude: 113.3380 },
  { content: '🍮双皮奶，广州甜品代表！奶香浓郁入口即化！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '广州市-越秀区-北京路', latitude: 23.1290, longitude: 113.2810 },

  // 深圳美食
  { content: '🦞深圳东门的小龙虾，麻辣鲜香！夏夜配啤酒绝配！', images: '["https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800","https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800"]', address: '深圳市-罗湖区-东门老街', latitude: 22.5490, longitude: 114.1310 },
  { content: '🍜潮汕牛肉火锅，现切牛肉超级新鲜！这才是牛肉的正确吃法！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800"]', address: '深圳市-福田区-华强北', latitude: 22.5400, longitude: 114.0880 },
  { content: '🥟深圳早茶，虾饺烧麦凤爪排骨，样样精致！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '深圳市-南山区-海上世界', latitude: 22.4850, longitude: 113.9070 },
  { content: '🍲椰子鸡，海南特色美食！汤清味甜超级养生！', images: '["https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800"]', address: '深圳市-罗湖区-KK Mall', latitude: 22.5390, longitude: 114.1270 },
  { content: '🦀深圳湾的避风塘炒蟹，蒜香四溢让人回味无穷！', images: '["https://images.unsplash.com/photo-1559337558-2f5a35f4523b?w=800"]', address: '深圳市-南山区-深圳湾大街', latitude: 22.5030, longitude: 113.9540 },

  // 南京美食
  { content: '🍜南京鸭血粉丝汤，汤鲜料足！南京人的早餐标配！', images: '["https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800"]', address: '南京市-玄武区-夫子庙', latitude: 32.0120, longitude: 118.7850 },
  { content: '🥟南京小笼包，皮薄汤多超级鲜美！早餐首选！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '南京市-秦淮区-老门东', latitude: 32.0020, longitude: 118.7920 },
  { content: '🍗南京盐水鸭，皮白肉嫩味道鲜美！南京特色美食！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800"]', address: '南京市-玄武区-湖南路', latitude: 32.0610, longitude: 118.7930 },
  { content: '🥘南京大排档，集合各种南京小吃！氛围味道俱佳！', images: '["https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800","https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800"]', address: '南京市-鼓楼区-中山北路', latitude: 32.0660, longitude: 118.7770 },
  { content: '🍡南京糖芋苗，桂花飘香软糯甜美！传统甜品！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '南京市-玄武区-明故宫', latitude: 32.0360, longitude: 118.8220 },

  // 西安美食
  { content: '🥙西安肉夹馍，腊汁肉香浓多汁配白吉馍，绝配！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '西安市-莲湖区-回民街', latitude: 34.2640, longitude: 108.9480 },
  { content: '🍜西安biangbiang面，面宽劲道油泼辣子香！陕西特色面食！', images: '["https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800"]', address: '西安市-碑林区-永兴坊', latitude: 34.2620, longitude: 108.9630 },
  { content: '🥟西安灌汤包，皮薄馅大汤汁饱满！轻轻一吸满口鲜！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '西安市-新城区-钟楼', latitude: 34.2600, longitude: 108.9430 },
  { content: '🍗西安葫芦鸡，外酥里嫩香气四溢！传统名菜！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800"]', address: '西安市-雁塔区-大唐芙蓉园', latitude: 34.2120, longitude: 108.9740 },
  { content: '🥤西安凉皮，酸辣爽口夏日必备！这才是夏天的正确打开方式！', images: '["https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800"]', address: '西安市-碑林区-小寨', latitude: 34.2240, longitude: 108.9480 },

  // 武汉美食
  { content: '🍜武汉热干面，芝麻酱香面条劲道！武汉人的早餐必选！', images: '["https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800"]', address: '武汉市-江汉区-吉庆街', latitude: 30.5920, longitude: 114.2880 },
  { content: '🥟武汉小笼包，皮薄汁多超级鲜美！早餐首选！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '武汉市-武昌区-户部巷', latitude: 30.5490, longitude: 114.3060 },
  { content: '🍗武汉周黑鸭，麻辣鲜香超级入味！追剧必备零食！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800"]', address: '武汉市-江汉区-江汉路', latitude: 30.5850, longitude: 114.2930 },
  { content: '🥘武汉排骨藕汤，莲藕粉糯排骨鲜香，汤浓味美！', images: '["https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800"]', address: '武汉市-汉阳区-钟家村', latitude: 30.5380, longitude: 114.2690 },
  { content: '🍡武汉豆皮，金黄酥脆馅料丰富！过早必吃！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '武汉市-武昌区-首义路', latitude: 30.5410, longitude: 114.3210 },

  // 长沙美食
  { content: '🌶️长沙臭豆腐，外酥里嫩汤汁饱满！闻着臭吃着香！', images: '["https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800"]', address: '长沙市-天心区-坡子街', latitude: 28.2290, longitude: 112.9760 },
  { content: '🍜长沙米粉，码子多样汤鲜粉滑！湖南人早餐标配！', images: '["https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800"]', address: '长沙市-岳麓区-麓山南路', latitude: 28.1890, longitude: 112.9450 },
  { content: '🦐口味虾，麻辣鲜香超级过瘾！夏夜宵夜首选！', images: '["https://images.unsplash.com/photo-1559337558-2f5a35f4523b?w=800"]', address: '长沙市-芙蓉区-五一广场', latitude: 28.2290, longitude: 112.9390 },
  { content: '🥘辣椒炒肉，湖南家常菜的灵魂！超级下饭！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800"]', address: '长沙市-雨花区-德思勤', latitude: 28.1490, longitude: 112.9270 },
  { content: '🍵长沙茶颜悦色，幽兰拿铁超级好喝！来长沙必打卡！', images: '["https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800"]', address: '长沙市-天心区-太平街', latitude: 28.1870, longitude: 112.9830 },

  // 苏州美食
  { content: '🍜苏式汤面，面条细软汤底鲜美！苏州人的早餐情怀！', images: '["https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800"]', address: '苏州市-姑苏区-观前街', latitude: 31.3240, longitude: 120.6240 },
  { content: '🥟苏州生煎，皮脆底香汤汁饱满！早餐首选！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '苏州市-平江区-平江路', latitude: 31.3130, longitude: 120.6370 },
  { content: '🦀苏州大闸蟹，蟹黄饱满蟹肉鲜甜！秋天必吃！', images: '["https://images.unsplash.com/photo-1559337558-2f5a35f4523b?w=800"]', address: '苏州市-吴中区-阳澄湖', latitude: 31.4340, longitude: 120.7750 },
  { content: '🥘松鼠鳜鱼，苏帮菜代表作！酸甜可口造型精美！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800"]', address: '苏州市-姑苏区-山塘街', latitude: 31.3060, longitude: 120.6110 },
  { content: '🍡苏州赤豆松糕，甜而不腻软糯可口！传统糕点！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '苏州市-吴江区-同里古镇', latitude: 31.1680, longitude: 120.7030 },

  // 厦门美食
  { content: '🦐厦门姜母鸭，香气四溢鸭肉酥烂！药膳美食！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800"]', address: '厦门市-思明区-中山路', latitude: 24.4660, longitude: 118.0810 },
  { content: '🍜厦门沙茶面，汤底浓郁配料丰富！早餐首选！', images: '["https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800"]', address: '厦门市-集美区-石鼓路', latitude: 24.5770, longitude: 118.1080 },
  { content: '🥟厦门烧肉粽，糯米软糯馅料丰富！闽南特色！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '厦门市-思明区-曾厝垵', latitude: 24.4430, longitude: 118.0930 },
  { content: '🦪厦门海蛎煎，外酥里嫩鲜香可口！海边必吃！', images: '["https://images.unsplash.com/photo-1559337558-2f5a35f4523b?w=800"]', address: '厦门市-思明区-轮渡', latitude: 24.4610, longitude: 118.0710 },
  { content: '🍵厦门馅饼，酥香可口甜而不腻！伴手礼首选！', images: '["https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800"]', address: '厦门市-思明区-鼓浪屿', latitude: 24.4480, longitude: 118.0620 },

  // 青岛美食
  { content: '🦐青岛啤酒配海鲜，鲜美无比！海边宵夜绝配！', images: '["https://images.unsplash.com/photo-1559337558-2f5a35f4523b?w=800","https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800"]', address: '青岛市-市南区-劈柴院', latitude: 36.0690, longitude: 120.3770 },
  { content: '🍜青岛排骨米饭，炖得软烂的排骨配米饭，太香了！', images: '["https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800"]', address: '青岛市-市北区-台东步行街', latitude: 36.0860, longitude: 120.3860 },
  { content: '🥟青岛鲅鱼饺子，馅大皮薄鲜香无比！特色水饺！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '青岛市-崂山区-石老人', latitude: 36.0940, longitude: 120.4830 },
  { content: '🦀青岛辣炒蛤蜊，麻辣鲜香超级下饭！必点海鲜！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800"]', address: '青岛市-市南区-中山路', latitude: 36.0690, longitude: 120.3850 },
  { content: '🍺青岛原浆啤酒，原汁原味醇厚爽口！来青岛必喝！', images: '["https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800"]', address: '青岛市-李沧区-啤酒街', latitude: 36.1270, longitude: 120.4120 },

  // 天津美食
  { content: '🥟天津狗不理包子，皮薄馅大汤汁多！天津招牌！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '天津市-和平区-劝业场', latitude: 39.1250, longitude: 117.2150 },
  { content: '🍜天津煎饼果子，绿豆面糊薄脆鸡蛋，香脆可口！', images: '["https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800"]', address: '天津市-南开区-古文化街', latitude: 39.1350, longitude: 117.2050 },
  { content: '🥘天津八大碗，传统天津菜集合！婚宴必备！', images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=800"]', address: '天津市-河北区-意风区', latitude: 39.1430, longitude: 117.1980 },
  { content: '🫓天津耳朵眼炸糕，酥脆香甜豆沙馅足！传统小吃！', images: '["https://images.unsplash.com/photo-1496116218417-1a781b1c16bd?w=800"]', address: '天津市-红桥区-大胡同', latitude: 39.1480, longitude: 117.1780 },
  { content: '🍵天津麻花，酥脆香甜嘎嘣脆！天津伴手礼！', images: '["https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800"]', address: '天津市-和平区-五大道', latitude: 39.1120, longitude: 117.2160 },
];

async function updateFoodPosts() {
  console.log('开始更新美食动态...\n');

  // 获取所有用户
  const users = await prisma.user.findMany({
    where: { role: 'user' },
  });

  console.log(`找到 ${users.length} 个普通用户\n`);

  // 获取所有现有动态
  const existingPosts = await prisma.post.findMany({
    orderBy: { id: 'desc' },
  });

  console.log(`现有 ${existingPosts.length} 条动态\n`);

  let updatedCount = 0;

  // 更新现有动态
  for (let i = 0; i < existingPosts.length; i++) {
    const post = existingPosts[i];
    const foodData = foodPosts[i % foodPosts.length];
    const user = users[post.userId % users.length] || users[0];

    await prisma.post.update({
      where: { id: post.id },
      data: {
        content: foodData.content,
        images: foodData.images,
        address: foodData.address,
        latitude: foodData.latitude + (Math.random() - 0.5) * 0.01,
        longitude: foodData.longitude + (Math.random() - 0.5) * 0.01,
        userId: user.id,
      },
    });

    updatedCount++;

    if (updatedCount % 500 === 0) {
      console.log(`已更新 ${updatedCount} 条动态...`);
    }
  }

  console.log(`\n✅ 更新完成！`);
  console.log(`- 总更新动态数: ${updatedCount}`);
  console.log(`- 美食内容数: ${foodPosts.length}`);
  console.log(`- 用户数: ${users.length}`);
}

updateFoodPosts()
  .then(() => {
    console.log('\n程序执行完毕');
    process.exit(0);
  })
  .catch((error) => {
    console.error('执行出错:', error);
    process.exit(1);
  });
