import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../../controllers/customer/payment.controller.js';

const router = Router();

// Require authentication for payment operations
router.use(authenticate, authorize('CUSTOMER', 'ADMIN'));

router.post('/create-order', createRazorpayOrder);
router.post('/verify-payment', verifyRazorpayPayment);

export default router;
