import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import {
  applyForInsurancePolicy,
  getMyApplications,
  getApplicationDetails,
} from '../../controllers/customer/application.customer.controller.js';
import { applyPolicySchema } from '../../validations/customer/application.customer.validation.js';

const router = Router();

// Protect all Customer Application routes for authenticated CUSTOMER and ADMIN users
router.use(authenticate, authorize('CUSTOMER', 'ADMIN'));

router.post('/customer/applications', validate(applyPolicySchema), applyForInsurancePolicy);
router.get('/customer/applications', getMyApplications);
router.get('/customer/applications/:id', getApplicationDetails);

export default router;
