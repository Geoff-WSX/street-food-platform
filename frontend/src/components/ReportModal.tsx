import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Upload, Button, message, Space, Tag } from 'antd';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { getReportTypes, createReport } from '../api/report';
import type { ReportType } from '../api/report';
import { getErrorMessage } from '../utils/error';

const { TextArea } = Input;
const { Option } = Select;

interface Props {
  open: boolean;
  onClose: () => void;
  reportedUserId: number;
  reportedUsername: string;
  chatRecords?: any[];
}

export default function ReportModal({ open, onClose, reportedUserId, reportedUsername, chatRecords = [] }: Props) {
  const [form] = Form.useForm();
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchReportTypes();
    }
  }, [open]);

  const fetchReportTypes = async () => {
    try {
      const res = await getReportTypes();
      setReportTypes(res.data?.data || res.data || []);
    } catch {
      // 加载失败时使用空列表
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // 上传图片
      const images: string[] = [];
      if (fileList.length > 0) {
        const formData = new FormData();
        fileList.forEach((file) => {
          if (file.originFileObj) {
            formData.append('files', file.originFileObj);
          }
        });

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('sf_token')}`,
          },
          body: formData,
        }).then((res) => res.json());

        if (uploadRes.success) {
          images.push(...uploadRes.data.urls);
        }
      }

      await createReport({
        reportedId: reportedUserId,
        type: values.type,
        description: values.description,
        images,
        chatRecords: chatRecords.length > 0 ? chatRecords : undefined,
      });

      void message.success('举报已提交，感谢您的反馈');
      form.resetFields();
      setFileList([]);
      onClose();
    } catch (error: unknown) {
      void message.error(error.response?.data?.error || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setFileList([]);
    onClose();
  };

  const uploadButton = (
    <button style={{ border: 0, background: 'none' }} type="button">
      {uploading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>上传图片</div>
    </button>
  );

  return (
    <Modal
      title={`举报用户: ${reportedUsername}`}
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={500}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {chatRecords.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Tag color="blue">已包含 {chatRecords.length} 条聊天记录</Tag>
          </div>
        )}

        <Form.Item
          label="举报类型"
          name="type"
          rules={[{ required: true, message: '请选择举报类型' }]}
        >
          <Select placeholder="请选择举报类型">
            {reportTypes.map((type) => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="详细描述"
          name="description"
          rules={[{ required: true, message: '请描述举报原因' }]}
        >
          <TextArea
            rows={4}
            placeholder="请详细描述举报原因，提供具体信息"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item label="证据图片">
          <Upload
            listType="picture-card"
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            beforeUpload={() => false}
            maxCount={5}
          >
            {fileList.length >= 5 ? null : uploadButton}
          </Upload>
          <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
            最多上传5张图片作为证据
          </div>
        </Form.Item>

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              提交举报
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
