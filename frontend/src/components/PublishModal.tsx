import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Form, Input, Button, Upload, message, Typography, Space } from 'antd';
import { PlusOutlined, EnvironmentOutlined, LoadingOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../api/post';
import { checkContent } from '../api/comment';
import { generateFoodCopy } from '../api/ai';
import type { UploadFile } from 'antd/es/upload';

const { Text } = Typography;

// 常量定义
const MODAL_CONFIG = {
  WIDTH: 520,
  MAX_CONTENT_LENGTH: 1000,
  MAX_ADDRESS_LENGTH: 200,
  MAX_IMAGES: 9
} as const;

const AI_COPY_MESSAGES = {
  EMPTY_KEYWORDS: '请先输入关键词',
  GENERATE_SUCCESS: '文案生成成功！',
  GENERATE_FAILED: '生成文案失败，请重试',
  COPY_APPLIED: '文案已应用',
  SERVICE_UNAVAILABLE: '内容审查服务暂时不可用，请文明发言'
} as const;

const COPY_CARD_STYLE = {
  marginBottom: 16,
  padding: 12,
  background: '#f5f5f5',
  borderRadius: 8
} as const;

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

  // AI 文案生成状态 - 合并为单个状态对象
  const [aiState, setAiState] = useState({
    keywords: '',
    isGenerating: false,
    generatedCopy: ''
  });

  // 派生状态：是否显示文案卡片
  const showCopyCard = useMemo(() => !!aiState.generatedCopy, [aiState.generatedCopy]);

  // 重置表单和文件列表 - 添加条件检查避免无意义更新
  useEffect(() => {
    if (!open) {
      form.resetFields();
      setFileList([]);
      setIsPrivate(false);
      // 只在有值时才更新，避免不必要的重渲染
      if (aiState.keywords !== '' || aiState.generatedCopy !== '') {
        setAiState({ keywords: '', isGenerating: false, generatedCopy: '' });
      }
    }
  }, [open, form, aiState.keywords, aiState.generatedCopy]);

  // 处理 AI 生成文案 - 修复重复 trim 调用
  const handleGenerateCopy = useCallback(async () => {
    const trimmedKeywords = aiState.keywords.trim();
    if (!trimmedKeywords) {
      void message.warning(AI_COPY_MESSAGES.EMPTY_KEYWORDS);
      return;
    }

    setAiState(prev => ({ ...prev, isGenerating: true }));
    try {
      const response = await generateFoodCopy(trimmedKeywords);
      if (response.data.success && response.data.data?.message) {
        setAiState(prev => ({ ...prev, generatedCopy: response.data.data.message, isGenerating: false }));
        void message.success(AI_COPY_MESSAGES.GENERATE_SUCCESS);
      } else {
        void message.error(AI_COPY_MESSAGES.GENERATE_FAILED);
        setAiState(prev => ({ ...prev, isGenerating: false }));
      }
    } catch {
      void message.error(AI_COPY_MESSAGES.GENERATE_FAILED);
      setAiState(prev => ({ ...prev, isGenerating: false }));
    }
  }, [aiState.keywords]);

  // 文案操作处理 - 合并为单个函数
  const handleCopyAction = useCallback((action: 'apply' | 'regenerate' | 'discard') => {
    switch (action) {
      case 'apply':
        if (aiState.generatedCopy) {
          form.setFieldsValue({ content: aiState.generatedCopy });
          setAiState(prev => ({ ...prev, generatedCopy: '' }));
          void message.success(AI_COPY_MESSAGES.COPY_APPLIED);
        }
        break;
      case 'regenerate':
        void handleGenerateCopy();
        break;
      case 'discard':
        setAiState(prev => ({ ...prev, generatedCopy: '' }));
        break;
    }
  }, [aiState.generatedCopy, form, handleGenerateCopy]);

  // 获取当前位置 - 改进版，支持多次尝试
  const getCurrentLocation = useCallback(() => {
    setLocationLoading(true);
    void message.loading({ content: '正在获取位置，请稍候...', key: 'location', duration: 0 });

    if (!navigator.geolocation) {
      void message.error('您的浏览器不支持定位功能');
      setLocationLoading(false);
      return;
    }

    // 首先尝试高精度定位
    const tryHighAccuracyLocation = () => {
      return new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      });
    };

    // 如果高精度失败，尝试低精度
    const tryLowAccuracyLocation = () => {
      return new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 300000
          }
        );
      });
    };

    // 执行定位
    (async () => {
      try {
        let position: GeolocationPosition;

        try {
          // 尝试高精度定位
          position = await tryHighAccuracyLocation();
          console.log('高精度定位成功');
        } catch {
          // 高精度失败，尝试低精度
          console.log('高精度定位失败，尝试低精度');
          position = await tryLowAccuracyLocation();
        }

        const { latitude, longitude } = position.coords;
        console.log('定位成功:', latitude, longitude);

        try {
          const response = await fetch(`http://localhost:3000/api/posts/address/location?lat=${latitude}&lng=${longitude}`);
          const data = await response.json();

          if (data.success && data.data && data.data.address) {
            const address = data.data.address;
            const details = data.data.details || {};
            const nearestPoi = details.nearestPoi;

            let displayAddress = address;
            // 如果有最近POI且地址中不包含，添加POI名称
            if (nearestPoi && !address.includes(nearestPoi)) {
              displayAddress = `${nearestPoi}（${address}）`;
            }

            form.setFieldsValue({ address: displayAddress });

            const accuracyMsg = details.accuracy === 'high'
              ? '✅ 定位成功！地址已精确填充'
              : details.accuracy === 'medium'
              ? '📍 定位成功，请确认地址是否准确'
              : '⚠️ 定位成功，但地址可能不够精确，建议手动调整';

            void message.success({
              content: accuracyMsg,
              key: 'location',
              duration: 4
            });
          } else {
            throw new Error('未返回地址信息');
          }
        } catch (err) {
          console.error('获取地址失败:', err);
          void message.error({ content: '获取地址失败，请手动输入', key: 'location', duration: 2 });
        }
      } catch (error) {
        const geolocationError = error as GeolocationPositionError;
        let errorMsg = '获取位置失败';
        switch (geolocationError.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            errorMsg = '定位权限被拒绝，请在浏览器设置中允许定位';
            break;
          case GeolocationPositionError.POSITION_UNAVAILABLE:
            errorMsg = '无法获取位置信息，请检查网络和GPS是否开启';
            break;
          case GeolocationPositionError.TIMEOUT:
            errorMsg = '定位超时，请确保在空旷处重试';
            break;
          default:
            errorMsg = `定位失败：${geolocationError.message || '未知错误'}`;
        }
        void message.error({ content: errorMsg, key: 'location', duration: 4 });
      } finally {
        setLocationLoading(false);
      }
    })();
  }, [form]);

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
    } catch {
      void message.warning(AI_COPY_MESSAGES.SERVICE_UNAVAILABLE);
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
      setAiState({ keywords: '', isGenerating: false, generatedCopy: '' });
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
      width={MODAL_CONFIG.WIDTH}
      closeIcon={<CloseOutlined style={{ fontSize: 18 }} />}
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
    >
      {/* 头部 */}
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <Text strong style={{ fontSize: 18, color: '#333' }}>发布美食动态</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* 图片上传 */}
        <Form.Item
          label={`美食图片 (1-${MODAL_CONFIG.MAX_IMAGES}张)`}
          required
          style={{ marginBottom: 16 }}
        >
          <Upload
            listType="picture-card"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: fl }) => setFileList(fl)}
            accept="image/*"
            maxCount={MODAL_CONFIG.MAX_IMAGES}
          >
            {fileList.length < MODAL_CONFIG.MAX_IMAGES && (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传</div>
              </div>
            )}
          </Upload>
        </Form.Item>

        {/* 内容输入 */}
        <Form.Item
          label="分享内容"
          name="content"
          rules={[{ required: true, message: '请填写分享内容' }]}
          style={{ marginBottom: 16 }}
        >
          <Input.TextArea
            rows={4}
            placeholder="这道美食怎么样？味道如何？有什么特别的推荐理由？..."
            showCount
            maxLength={MODAL_CONFIG.MAX_CONTENT_LENGTH}
          />
        </Form.Item>

        {/* AI 文案生成 */}
        <div style={{ marginBottom: 16 }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入关键词让AI帮你写文案..."
              value={aiState.keywords}
              onChange={(e) => setAiState(prev => ({ ...prev, keywords: e.target.value }))}
              onPressEnter={handleGenerateCopy}
            />
            <Button
              type="primary"
              onClick={handleGenerateCopy}
              loading={aiState.isGenerating}
            >
              AI生成
            </Button>
          </Space.Compact>
        </div>

        {/* 生成的文案预览 */}
        {showCopyCard && (
          <div style={COPY_CARD_STYLE}>
            <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>AI生成文案：</div>
            <div style={{ marginBottom: 12, whiteSpace: 'pre-wrap', fontSize: 14 }}>
              {aiState.generatedCopy}
            </div>
            <Space>
              <Button size="small" type="primary" onClick={() => handleCopyAction('apply')}>使用</Button>
              <Button size="small" onClick={() => handleCopyAction('regenerate')} loading={aiState.isGenerating}>重新生成</Button>
              <Button size="small" onClick={() => handleCopyAction('discard')}>丢弃</Button>
            </Space>
          </div>
        )}

        {/* 位置信息 */}
        <Form.Item name="address" style={{ marginBottom: 12 }}>
          <Input.TextArea
            placeholder="填写店铺地址（选填）"
            autoSize={{ minRows: 2, maxRows: 3 }}
            maxLength={MODAL_CONFIG.MAX_ADDRESS_LENGTH}
          />
        </Form.Item>

        <Button
          icon={locationLoading ? <LoadingOutlined /> : <EnvironmentOutlined />}
          onClick={getCurrentLocation}
          loading={locationLoading}
          block
          style={{ marginBottom: 16 }}
        >
          获取当前位置
        </Button>

        {/* 隐私设置 */}
        <Space style={{ marginBottom: 16 }}>
          <Button
            size="small"
            type={isPrivate ? 'primary' : 'default'}
            onClick={() => setIsPrivate(!isPrivate)}
          >
            {isPrivate ? '私密' : '公开'}
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {isPrivate ? '仅自己可见' : '所有人可见'}
          </Text>
        </Space>

        {/* 发布按钮 */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
          >
            {loading ? '发布中...' : '发布动态'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
