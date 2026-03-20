import { useState } from 'react';
import { Form, Input, Button, Upload, message, Typography, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../api/post';
import type { UploadFile } from 'antd/es/upload';

const { Title } = Typography;
const { TextArea } = Input;

export default function PublishPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: { content: string; address?: string }) => {
    if (fileList.length === 0) {
      void message.warning('请至少上传一张图片');
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
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 0' }}>
      <Card>
        <Title level={4} style={{ marginBottom: 24 }}>发布动态</Title>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="图片" required>
            <Upload
              listType="picture-card"
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: fl }) => setFileList(fl)}
              accept="image/*"
              maxCount={9}
            >
              {fileList.length < 9 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传图片</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item
            label="内容"
            name="content"
            rules={[{ required: true, message: '请填写内容' }, { max: 1000, message: '最多1000字' }]}
          >
            <TextArea rows={4} placeholder="分享你的街边美食体验..." showCount maxLength={1000} />
          </Form.Item>

          <Form.Item label="地址" name="address">
            <Input placeholder="填写地址（选填）" prefix="📍" maxLength={200} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              发布
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
