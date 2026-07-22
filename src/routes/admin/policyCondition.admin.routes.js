import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import {
  upsertPolicyCondition,
  deletePolicyCondition,
  seedSamplePolicyConditions,
} from '../../controllers/admin/policyCondition.admin.controller.js';
import { createOrUpdatePolicyConditionSchema } from '../../validations/admin/policyCondition.admin.validation.js';

const router = Router();

// Protect ALL Admin Policy Condition routes for ADMIN users only
router.use(authenticate, authorize('ADMIN'));

router.post('/policy-conditions', validate(createOrUpdatePolicyConditionSchema), upsertPolicyCondition);
router.post('/policy-conditions/seed', seedSamplePolicyConditions);
router.delete('/policy-conditions/:id', deletePolicyCondition);

export default router;
