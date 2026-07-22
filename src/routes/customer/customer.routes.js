import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import {
  getCustomerDashboard,
  explorePlansWithQuotes,
  submitCustomerKyc,
  getCustomerKyc,
  createPolicyProposal,
  getMyPolicies,
  getPolicyDetails,
} from '../../controllers/customer/customer.controller.js';
import {
  submitKycSchema,
  explorePlansSchema,
  createProposalSchema,
} from '../../validations/customer/customer.validation.js';

const router = Router();

// Mobile App Dashboard & Dynamic Quote Engine (Public / Optional Auth)
router.get('/customer/dashboard', getCustomerDashboard);
router.post('/customer/explore-plans', validate(explorePlansSchema), explorePlansWithQuotes);

// Protect all remaining Customer routes for logged-in CUSTOMER & ADMIN users
router.use(authenticate, authorize('CUSTOMER', 'ADMIN'));

// Customer KYC Routes
router
  .route('/customer/kyc')
  .post(validate(submitKycSchema), submitCustomerKyc)
  .get(getCustomerKyc);

// Proposals & Active Customer Policies Routes
router.post('/customer/proposals', validate(createProposalSchema), createPolicyProposal);
router.get('/customer/my-policies', getMyPolicies);
router.get('/customer/my-policies/:id', getPolicyDetails);

export default router;
