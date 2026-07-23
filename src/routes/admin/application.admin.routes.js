import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import {
  getDashboardStats,
  getAllApplications,
  getAdminApplicationDetails,
  updateApplicationStatus,
} from '../../controllers/admin/application.admin.controller.js';
import { updateApplicationStatusSchema } from '../../validations/admin/application.admin.validation.js';

const router = Router();

// Protect all Admin Application & Dashboard routes for ADMIN users only
router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard/stats', getDashboardStats);
router.get('/applications', getAllApplications);
router.get('/applications/:id', getAdminApplicationDetails);
router.patch('/applications/:id/status', validate(updateApplicationStatusSchema), updateApplicationStatus);

export default router;
