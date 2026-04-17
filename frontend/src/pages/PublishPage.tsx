import { useState } from 'react';
import { Form, Input, Button, Upload, message, Typography, Card, Space, Divider, Tooltip } from 'antd';
import { PlusOutlined, EnvironmentOutlined, LoadingOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../api/post';
import type { UploadFile } from 'antd/es/upload';

// 声明 AMap 类型
declare global {
  interface Window {
    AMap?: unknown;
  }
}

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function PublishPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');

  // 预览图片
  const handlePreview = (file: UploadFile) => {
    setPreviewImage(file.url || (file.originFileObj && URL.createObjectURL(file.originFileObj)) || '');
  };

  const getCurrentLocation = () => {
    setLocationLoading(true);
    void message.loading({ content: '正在获取位置，请稍候...', key: 'location', duration: 0 });

    if (!navigator.geolocation) {
      void message.error('您的浏览器不支持定位功能');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(`/api/posts/address/location?lat=${latitude}&lng=${longitude}`);
          const data = await response.json();

          if (data.success && data.data && data.data.address) {
            const address = data.data.address;
            const details = data.data.details || {};
            const nearestPoi = details.nearestPoi;

            // 构建更详细的地址
            let displayAddress = address;
            if (nearestPoi && !address.includes(nearestPoi)) {
              displayAddress = `${address}${nearestPoi}`;
            }

            form.setFieldsValue({ address: displayAddress });

            // 根据精度给出不同的提示
            const accuracyTips: Record<string, string> = {
              high: '定位成功！地址已精确填充',
              medium: '定位成功，地址已填充，请确认是否准确',
              low: '定位成功，但地址可能不精确，请手动确认',
              none: '定位成功，但地址获取失败，请手动输入'
            };
            void message.info({ content: accuracyTips[details.accuracy] || accuracyTips.medium, key: 'location', duration: 3 });
          } else {
            throw new Error('未返回地址信息');
          }
        } catch {
          void message.error({ content: '获取地址失败，请手动输入', key: 'location', duration: 2 });
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        let errorMsg = '获取位置失败';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = '定位权限被拒绝，请在浏览器设置中允许定位';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = '无法获取位置信息，请检查网络和GPS是否开启';
            break;
          case error.TIMEOUT:
            errorMsg = '定位超时，请确保在空旷处重试';
            break;
        }
        void message.error({ content: errorMsg, key: 'location', duration: 3 });
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true, // 高精度模式
        timeout: 30000,           // 30秒超时
        maximumAge: 60000         // 允许1分钟内的缓存
      }
    );
  };

  const handleSubmit = async (values: { content: string; address?: string }) => {
    if (fileList.length === 0) {
      void message.warning('请至少上传一张美食图片');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', values.content);
      if (values.address) formData.append('address', values.address);
      fileList.forEach((f) => {
        if (f.originFileObj) formData.append('images', f.originFileObj);
      });
      const post = await createPost(formData);
      void message.success('发布成功！');
      navigate(`/post/${post.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px', paddingBottom: 80 }}>
      <Card
        bordered={false}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: 12 }}
      >
        {/* 页面标题 */}
        <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
          <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
            🍜 发布美食动态
          </Title>
          <Text type="secondary" style={{ fontSize: 14, marginTop: 8, display: 'block' }}>
            分享你发现的美食，让更多人了解
          </Text>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {/* 图片上传 */}
          <Form.Item
            label={
              <Space>
                <span style={{ fontWeight: 500 }}>美食图片</span>
                <Text type="secondary" style={{ fontSize: 12 }}>至少上传1张，最多9张</Text>
              </Space>
            }
            required
            style={{ marginBottom: 24 }}
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: fl }) => setFileList(fl)}
              onPreview={handlePreview}
              accept="image/*"
              maxCount={9}
              style={{ width: '100%' }}
            >
              {fileList.length < 9 && (
                <div style={{ width: 104, height: 104 }}>
                  <PlusOutlined style={{ fontSize: 24, color: '#d9d9d9' }} />
                  <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>上传图片</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          {/* 内容输入 */}
          <Form.Item
            label={<span style={{ fontWeight: 500 }}>分享内容</span>}
            name="content"
            rules={[{ required: true, message: '请填写分享内容' }, { max: 1000, message: '最多1000字' }]}
            style={{ marginBottom: 24 }}
          >
            <TextArea
              rows={5}
              placeholder="这道美食怎么样？味道如何？有什么特别的推荐理由？..."
              showCount
              maxLength={1000}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Divider style={{ margin: '24px 0' }} />

          {/* 位置信息 */}
          <div style={{ marginBottom: 24 }}>
            <Space style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 500 }}>位置信息</span>
              <Tooltip title="添加位置可以让更多人找到这家店">
                <InfoCircleOutlined style={{ color: '#999', cursor: 'help' }} />
              </Tooltip>
            </Space>

            <Form.Item name="address" style={{ marginBottom: 12 }}>
              <Input.TextArea
                placeholder="填写店铺地址，例如：浙江省杭州市西湖区文三路 123 号"
                autoSize={{ minRows: 2, maxRows: 4 }}
                maxLength={200}
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Button
              icon={locationLoading ? <LoadingOutlined /> : <EnvironmentOutlined />}
              onClick={getCurrentLocation}
              loading={locationLoading}
              block
              size="large"
              style={{
                borderRadius: 8,
                height: 44,
                fontSize: 15
              }}
            >
              {locationLoading ? '正在获取位置...' : '📍 获取当前位置'}
            </Button>
          </div>

          <Divider style={{ margin: '24px 0' }} />

          {/* 发布按钮 */}
          <Form.Item style={{ marginBottom: 0 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{
                  height: 48,
                  fontSize: 16,
                  fontWeight: 500,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}
              >
                {loading ? '发布中...' : '🎉 发布动态'}
              </Button>
              <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
                发布即表示你同意遵守社区规范，请发布真实内容
              </Text>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 图片预览 */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40
          }}
          onClick={() => setPreviewImage('')}
        >
          <img
            src={previewImage}
            alt="预览"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            type="text"
            icon={<CloseCircleOutlined />}
            onClick={() => setPreviewImage('')}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              color: '#fff',
              fontSize: 32
            }}
          />
        </div>
      )}
    </div>
  );
}
