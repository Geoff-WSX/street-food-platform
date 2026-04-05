// 测试API数据流
const axios = require('axios');

async function testAPI() {
  console.log('🧪 测试后端API...\n');

  try {
    // 测试直接访问后端
    console.log('1️⃣ 直接访问后端API:');
    const backendRes = await axios.get('http://localhost:3000/api/posts/random?limit=2');
    console.log('✅ 后端状态:', backendRes.status);
    console.log('✅ 数据结构:', {
      success: backendRes.data.success,
      hasData: !!backendRes.data.data,
      hasDataData: !!backendRes.data.data?.data,
      postCount: backendRes.data.data?.data?.length || 0
    });

    if (backendRes.data.data?.data?.[0]) {
      const post = backendRes.data.data.data[0];
      console.log('✅ 第一条动态:', {
        id: post.id,
        content: post.content?.substring(0, 30),
        hasImages: !!post.images,
        imagesType: Array.isArray(post.images) ? 'array' : typeof post.images,
        imagesLength: Array.isArray(post.images) ? post.images.length : 'N/A',
        hasUser: !!post.user,
        username: post.user?.username
      });
    }

    console.log('\n2️⃣ 通过前端代理访问:');
    const frontendRes = await axios.get('http://localhost:5176/api/posts/random?limit=2');
    console.log('✅ 前端代理状态:', frontendRes.status);
    console.log('✅ 数据结构:', {
      success: frontendRes.data.success,
      hasData: !!frontendRes.data.data,
      hasDataData: !!frontendRes.data.data?.data,
      postCount: frontendRes.data.data?.data?.length || 0
    });

    console.log('\n✅ API测试完成！数据流正常。');
    console.log('\n💡 如果前端页面仍然没有数据，请检查浏览器控制台是否有JavaScript错误。');

  } catch (error) {
    console.error('❌ API测试失败:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testAPI();
