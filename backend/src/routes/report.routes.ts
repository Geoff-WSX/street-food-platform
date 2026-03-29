import { Router } from 'express';
import {
  createReport,
  getReports,
  getMyReports,
  reviewReport,
  handleReport,
  getReportDetail,
  getReportStats,
  REPORT_TYPES,
} from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireReviewer } from '../middleware/admin';

const router = Router();

// 获取举报类型（公开接口）
router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: REPORT_TYPES.map((type) => ({
      value: type,
      label: {
        spam: '垃圾信息',
        harassment: '骚扰',
        inappropriate: '不当内容',
        fake: '虚假信息',
        scam: '诈骗',
        other: '其他',
      }[type],
    })),
  });
});

// 需要登录的路由
router.use(authenticate);

// 创建举报
router.post('/', createReport);

// 获取我的举报列表
router.get('/my', getMyReports);

// 审核员和管理员都可以获取举报列表
router.get('/all', getReports);

// 审核员路由 - 第一级审核
router.put('/:id/review', requireReviewer, reviewReport);

// 管理员路由
router.get('/stats', requireAdmin, getReportStats);
router.get('/:id', requireAdmin, getReportDetail);
router.put('/:id/handle', requireAdmin, handleReport);

export default router;
