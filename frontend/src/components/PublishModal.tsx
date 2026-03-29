import { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Upload, message, Typography, Space, Divider } from 'antd';
import { PlusOutlined, EnvironmentOutlined, LoadingOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../api/post';
import { checkContent } from '../api/comment';
import type { UploadFile } from 'antd/es/upload';

const { Title, Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PublishModal({ open, onClose }: Props) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  // 重置表单和文件列表
  useEffect(() => {
    if (!open) {
      form.resetFields();
      setFileList([]);
      setIsPrivate(false);
    }
  }, [open, form]);

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
            form.setFieldsValue({ address: address });
            void message.success({ content: '定位成功！地址已自动填充', key: 'location', duration: 2 });
          } else {
            throw new Error('未返回地址信息');
          }
        } catch (error) {
          void message.error({ content: '获取地址失败，请手动输入', key: 'location', duration: 2 });
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        let errorMsg = '获取位置失败';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = '定位权限被拒绝';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = '无法获取位置信息';
            break;
          case error.TIMEOUT:
            errorMsg = '定位超时，请重试';
            break;
        }
        void message.error({ content: errorMsg, key: 'location', duration: 2 });
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (values: { content: string; address?: string }) => {
    if (fileList.length === 0) {
      void message.warning('请至少上传一张美食图片');
      return;
    }

    // 文字审查
    try {
      const checkResult = await checkContent(values.content);
      if (!checkResult.data.valid) {
        void message.error(checkResult.data.message || '内容包含违规词汇，请修改后重试');
        return;
      }
    } catch (error: any) {
      console.error('Content check failed:', error);
      // 审查失败时允许继续，但给出警告
      void message.warning('内容审查服务暂时不可用，请文明发言');
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', values.content);
      if (values.address) formData.append('address', values.address);
      formData.append('isPrivate', isPrivate ? 'true' : 'false');
      fileList.forEach((f) => {
        if (f.originFileObj) formData.append('images', f.originFileObj);
      });
      const post = await createPost(formData);
      void message.success('发布成功！');
      form.resetFields();
      setFileList([]);
      setIsPrivate(false);
      onClose();
      navigate(`/post/${post.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      closeIcon={<CloseOutlined style={{ fontSize: 20 }} />}
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
    >
      {/* 头部 */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <Title level={4} style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          🍜 发布美食动态
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          分享你发现的街边美食
        </Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* 图片上传 */}
        <Form.Item
          label={
            <Space>
              <span style={{ fontWeight: 500 }}>美食图片</span>
              <Text type="secondary" style={{ fontSize: 12 }}>1-9张</Text>
            </Space>
          }
          required
          style={{ marginBottom: 16 }}
        >
          <Upload
            listType="picture-card"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: fl }) => setFileList(fl)}
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
          style={{ marginBottom: 16 }}
        >
          <Input.TextArea
            rows={4}
            placeholder="这道美食怎么样？味道如何？有什么特别的推荐理由？..."
            showCount
            maxLength={1000}
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        {/* 隐私设置 */}
        <Form.Item style={{ marginBottom: 16 }}>
          <Button
            type={isPrivate ? 'primary' : 'default'}
            onClick={() => setIsPrivate(!isPrivate)}
            style={{ borderRadius: 8 }}
          >
            {isPrivate ? '🔒 仅自己可见' : '🌐 公开'}
          </Button>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            {isPrivate ? '开启后只有你能看到这条动态' : '关闭后所有人都能看到'}
          </Text>
        </Form.Item>

        <Divider style={{ margin: '16px 0' }} />

        {/* 位置信息 */}
        <div style={{ marginBottom: 16 }}>
          <Space style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>位置信息</span>
          </Space>

          <Form.Item name="address" style={{ marginBottom: 8 }}>
            <Input.TextArea
              placeholder="填写店铺地址（选填）"
              autoSize={{ minRows: 2, maxRows: 3 }}
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
              height: 40,
              fontSize: 14
            }}
          >
            {locationLoading ? '正在获取位置...' : '📍 获取当前位置'}
          </Button>
        </div>

        <Divider style={{ margin: '16px 0' }} />

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
                height: 44,
                fontSize: 15,
                fontWeight: 500,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              {loading ? '发布中...' : '🎉 发布动态'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
