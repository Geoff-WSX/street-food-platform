import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';

/**
 * 输入验证中间件
 * 防止注入攻击、确保数据完整性
 */

// ========== 验证规则 ==========

// 用户名验证规则
export const usernameRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_]+/)
    .withMessage('用户名只能包含字母、数字和下划线')
    .custom(async (username) => {
      // 检查是否包含敏感词
      const forbiddenWords = ['admin', 'root', 'system', 'api', 'test'];
      if (forbiddenWords.some(word => username.toLowerCase().includes(word))) {
        throw new Error('用户名包含禁用词汇');
      }
      return true;
    })
];

// 密码验证规则
export const passwordRules = [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('密码长度必须在8-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个大写字母、一个小写字母和一个数字')
    .not()
    .matches(/[<>\"'&]/)
    .withMessage('密码包含非法字符')
];

// 邮箱验证规则
export const emailRules = [
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .isLength({ max: 100 })
    .withMessage('邮箱地址过长')
];

// 动态内容验证规则
export const postContentRules = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('内容不能为空')
    .isLength({ max: 5000 })
    .withMessage('内容长度不能超过5000个字符')
    .custom((content) => {
      // 检查 XSS 攻击模式
      const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // 事件处理器
        /<object[^>]*>/gi,
        /<embed[^>]*>/gi
      ];

      for (const pattern of xssPatterns) {
        if (pattern.test(content)) {
          throw new Error('内容包含非法字符');
        }
      }

      // 检查 SQL 注入模式
      const sqlPatterns = [
        /(\bunion\b.*\bselect\b)/gi,
        /(\bdrop\b.*\btable\b)/gi,
        /(\bdelete\b.*\bfrom\b)/gi,
        /(\binsert\b.*\binto\b)/gi,
        /(\bupdate\b.*\bset\b)/gi,
        /(--)|(#)|(\/\*)|(\*\/)/g
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(content)) {
          throw new Error('内容包含非法字符');
        }
      }

      return true;
    })
];

// 评论内容验证规则
export const commentContentRules = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('评论内容不能为空')
    .isLength({ max: 1000 })
    .withMessage('评论长度不能超过1000个字符')
    .custom((content) => {
      // 简化的 XSS 检查
      if (/<script|<iframe|javascript:/i.test(content)) {
        throw new Error('评论包含非法字符');
      }
      return true;
    })
];

// ID 参数验证规则
export const idParamRules = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数')
    .toInt()
];

// 分页参数验证规则
export const paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须大于0')
    .toInt(),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间')
    .toInt()
];

// 搜索关键词验证规则
export const searchKeywordRules = [
  query('keyword')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('搜索关键词过长')
    .custom((keyword) => {
      // 防止搜索注入
      if (/[<>\"'&]/.test(keyword)) {
        throw new Error('搜索关键词包含非法字符');
      }
      return true;
    })
];

// 图片URL验证规则
export const imageUrlRules = [
  body('images')
    .optional()
    .isArray()
    .withMessage('图片必须是数组')
    .custom((images) => {
      if (images.length > 9) {
        throw new Error('最多上传9张图片');
      }

      // 验证每个URL
      for (const url of images) {
        if (typeof url !== 'string') {
          throw new Error('图片URL格式错误');
        }

        // 检查是否是有效的URL
        try {
          new URL(url.startsWith('http') ? url : `http://${url}`);
        } catch {
          throw new Error('图片URL格式错误');
        }

        // 防止JavaScript协议
        if (url.toLowerCase().startsWith('javascript:')) {
          throw new Error('图片URL包含非法协议');
        }
      }

      return true;
    })
];

// 地理位置验证规则
export const locationRules = [
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('纬度必须在-90到90之间'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('经度必须在-180到180之间'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('地址长度不能超过255个字符')
];

// 标签验证规则
export const tagRules = [
  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组')
    .custom((tags) => {
      if (tags.length > 10) {
        throw new Error('最多添加10个标签');
      }

      for (const tag of tags) {
        if (typeof tag !== 'string') {
          throw new Error('标签格式错误');
        }

        if (tag.length > 20) {
          throw new Error('标签长度不能超过20个字符');
        }

        if (/[<>\"'&]/.test(tag)) {
          throw new Error('标签包含非法字符');
        }
      }

      return true;
    })
];

// 举报类型验证规则
export const reportTypeRules = [
  body('type')
    .isIn(['spam', 'inappropriate', 'harassment', 'fake', 'other'])
    .withMessage('举报类型无效')
];

// 用户角色验证规则
export const userRoleRules = [
  body('role')
    .isIn(['user', 'reviewer', 'admin'])
    .withMessage('用户角色无效')
];

// ========== 验证中间件 ==========

/**
 * 验证请求结果中间件
 * 检查验证结果，如果有错误则返回
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '请求数据验证失败',
      error: 'VALIDATION_ERROR',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg
      }))
    });
  }

  next();
};

/**
 * 组合验证规则和验证中间件
 */
export const validate = (validations: ValidationChain[]) => {
  return [...validations, validateRequest];
};

// ========== 清理和转义 ==========

/**
 * 清理字符串输入
 * 移除危险字符、转义特殊字符
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    // 移除控制字符
    .replace(/[\x00-\x1F\x7F]/g, '')
    // 转义HTML特殊字符
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // 移除危险协议
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
};

/**
 * 清理对象输入
 * 递归清理对象的所有字符串属性
 */
export const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[sanitizeString(key)] = sanitizeObject(value);
    }
    return cleaned;
  }

  return obj;
};

/**
 * 请求体清理中间件
 */
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// ========== 导出常用验证组合 ==========

// 注册验证
export const validateRegister = validate([
  ...usernameRules,
  ...emailRules,
  ...passwordRules
]);

// 登录验证
export const validateLogin = validate([
  body('email')
    .trim()
    .notEmpty()
    .withMessage('邮箱不能为空'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
  body('captchaId')
    .notEmpty()
    .withMessage('验证码ID不能为空'),
  body('captchaCode')
    .notEmpty()
    .withMessage('验证码不能为空')
]);

// 创建动态验证
export const validateCreatePost = validate([
  ...postContentRules,
  ...imageUrlRules,
  ...locationRules,
  ...tagRules
]);

// 评论验证
export const validateComment = validate([
  ...idParamRules,
  ...commentContentRules
]);

// 搜索验证
export const validateSearch = validate([
  ...searchKeywordRules,
  ...paginationRules
]);

// 用户角色更新验证
export const validateUpdateRole = validate([
  ...idParamRules,
  ...userRoleRules
]);
