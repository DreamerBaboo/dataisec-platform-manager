import express from 'express';
import { authMiddleware, checkPermission } from '../middleware/auth';
import { IMAGE_PERMISSIONS } from '../config/permissions';
import * as imageController from '../controllers/imageController';
import * as registryController from '../controllers/registryController';
import * as bulkController from '../controllers/bulkController';
import * as searchController from '../controllers/searchController';

const router = express.Router();

// 基本鏡像操作
router.get('/', 
  authMiddleware,
  checkPermission(IMAGE_PERMISSIONS.VIEW),
  searchController.searchImages
);

// ... 其他現有路由 ...

// Registry 相關
router.get('/registry/health',
  authMiddleware,
  checkPermission(IMAGE_PERMISSIONS.MANAGE),
  registryController.checkHealth
);

// 批量操作
router.post('/bulk/delete',
  authMiddleware,
  checkPermission(IMAGE_PERMISSIONS.DELETE),
  bulkController.bulkDelete
);

router.post('/bulk/push',
  authMiddleware,
  checkPermission(IMAGE_PERMISSIONS.PUSH),
  bulkController.bulkPush
);

export default router; 