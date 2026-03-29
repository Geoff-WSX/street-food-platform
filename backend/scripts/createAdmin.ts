import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('创建管理员账号...\n');

  const adminEmail = 'admin@food.com';
  const adminPassword = 'admin123456';
  const adminUsername = 'admin';

  // 检查管理员是否已存在
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('✅ 管理员账号已存在');
    console.log(`   邮箱: ${adminEmail}`);
    console.log(`   用户名: ${existingAdmin.username}`);
    console.log(`   角色: ${existingAdmin.role}`);
    await prisma.$disconnect();
    return;
  }

  // 创建管理员账号
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      bio: '系统管理员',
    },
  });

  console.log('✅ 管理员账号创建成功！');
  console.log(`   邮箱: ${adminEmail}`);
  console.log(`   密码: ${adminPassword}`);
  console.log(`   用户名: ${adminUsername}`);
  console.log(`   角色: ${admin.role}`);
  console.log('\n⚠️  请及时修改默认密码！\n');

  await prisma.$disconnect();
}

createAdmin();
