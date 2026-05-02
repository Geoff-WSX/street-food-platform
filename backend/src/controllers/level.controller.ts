import { Response } from 'express';
import { AuthRequest } from '../types';
import * as levelService from '../services/level.service';
import { successResponse, errorResponse } from '../utils/response';

/**
 * 获取所有等级定义
 * GET /api/levels
 */
export const getAllLevels = async (req: AuthRequest, res: Response) => {
  try {
    const levels = await levelService.getAllLevels();
    return successResponse(res, levels);
  } catch (error: any) {
    return errorResponse(res, error.message, 'GET_LEVELS_FAILED');
  }
};

/**
 * 获取所有任务定义
 * GET /api/levels/tasks
 */
export const getAllTasks = async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await levelService.getAllTasks();
    return successResponse(res, tasks);
  } catch (error: any) {
    return errorResponse(res, error.message, 'GET_TASKS_FAILED');
  }
};

/**
 * 获取当前用户等级信息
 * GET /api/levels/me
 */
export const getMyLevelInfo = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const levelInfo = await levelService.getUserLevelInfo(userId);
    return successResponse(res, levelInfo);
  } catch (error: any) {
    return errorResponse(res, error.message, 'GET_LEVEL_INFO_FAILED');
  }
};

/**
 * 初始化用户等级（首次登录时调用）
 * POST /api/levels/init
 */
export const initLevel = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userLevel = await levelService.initUserLevel(userId);
    return successResponse(res, userLevel, '等级初始化成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'INIT_LEVEL_FAILED');
  }
};

/**
 * 检查并更新用户任务进度
 * POST /api/levels/check
 */
export const checkProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const results = await levelService.checkAndGrantRewards(userId);
    return successResponse(res, results, '进度检查完成');
  } catch (error: any) {
    return errorResponse(res, error.message, 'CHECK_PROGRESS_FAILED');
  }
};

/**
 * 更新指定任务进度（内部调用）
 * POST /api/levels/tasks/:taskKey/progress
 */
export const updateTaskProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskKey } = req.params;
    const { currentCount } = req.body;

    if (currentCount === undefined || typeof currentCount !== 'number') {
      return errorResponse(res, '缺少 currentCount 参数或参数类型错误', 'INVALID_PARAM');
    }

    const result = await levelService.updateTaskProgress(userId, taskKey, currentCount);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'UPDATE_PROGRESS_FAILED');
  }
};

/**
 * 增加任务进度（用于每日任务等需要递增的场景）
 * POST /api/levels/tasks/:taskKey/increment
 */
export const incrementTaskProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { taskKey } = req.params;
    const { amount } = req.body;
    const increment = typeof amount === 'number' ? amount : 1;

    const result = await levelService.incrementTaskProgress(userId, taskKey, increment);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'INCREMENT_PROGRESS_FAILED');
  }
};