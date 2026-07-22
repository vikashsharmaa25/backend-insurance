import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import {
  createPlan,
  getAllPlans,
  getSinglePlan,
  updatePlan,
  deletePlan,
  togglePlanStatus,
  createPlanOption,
  getPlanOptions,
  getSinglePlanOption,
  updatePlanOption,
  deletePlanOption,
  togglePlanOptionStatus,
  createCoverage,
  getAllCoverages,
  getSingleCoverage,
  updateCoverage,
  deleteCoverage,
  toggleCoverageStatus,
  createSumInsured,
  getAllSumInsureds,
  getSingleSumInsured,
  updateSumInsured,
  deleteSumInsured,
  toggleSumInsuredStatus,
  createAgeSlab,
  getAllAgeSlabs,
  getSingleAgeSlab,
  updateAgeSlab,
  deleteAgeSlab,
  toggleAgeSlabStatus,
  createFamilyType,
  getAllFamilyTypes,
  getSingleFamilyType,
  updateFamilyType,
  deleteFamilyType,
  toggleFamilyTypeStatus,
  seedAllDataController,
} from '../../controllers/admin/plan.admin.controller.js';
import {
  createPlanSchema,
  updatePlanSchema,
  createPlanOptionSchema,
  updatePlanOptionSchema,
  createCoverageSchema,
  updateCoverageSchema,
  createSumInsuredSchema,
  updateSumInsuredSchema,
  createAgeSlabSchema,
  updateAgeSlabSchema,
  createFamilyTypeSchema,
  updateFamilyTypeSchema,
  statusToggleSchema,
} from '../../validations/admin/plan.admin.validation.js';

const router = Router();

// Endpoint to seed all database masters & matrices
router.post('/seed-all', seedAllDataController);

// Protect ALL Admin Plan Master routes for ADMIN users only
router.use(authenticate, authorize('ADMIN'));

// Insurance Plans
router.route('/plans').post(validate(createPlanSchema), createPlan).get(getAllPlans);
router.route('/plans/:id').get(getSinglePlan).put(validate(updatePlanSchema), updatePlan).delete(deletePlan);
router.patch('/plans/:id/status', validate(statusToggleSchema), togglePlanStatus);

// Plan Options
router.route('/plan-options').post(validate(createPlanOptionSchema), createPlanOption).get(getPlanOptions);
router.route('/plan-options/:id').get(getSinglePlanOption).put(validate(updatePlanOptionSchema), updatePlanOption).delete(deletePlanOption);
router.patch('/plan-options/:id/status', validate(statusToggleSchema), togglePlanOptionStatus);

// Coverage Master
router.route('/coverages').post(validate(createCoverageSchema), createCoverage).get(getAllCoverages);
router.route('/coverages/:id').get(getSingleCoverage).put(validate(updateCoverageSchema), updateCoverage).delete(deleteCoverage);
router.patch('/coverages/:id/status', validate(statusToggleSchema), toggleCoverageStatus);

// Sum Insured Master
router.route('/sum-insured').post(validate(createSumInsuredSchema), createSumInsured).get(getAllSumInsureds);
router.route('/sum-insured/:id').get(getSingleSumInsured).put(validate(updateSumInsuredSchema), updateSumInsured).delete(deleteSumInsured);
router.patch('/sum-insured/:id/status', validate(statusToggleSchema), toggleSumInsuredStatus);

// Age Slab Master
router.route('/age-slabs').post(validate(createAgeSlabSchema), createAgeSlab).get(getAllAgeSlabs);
router.route('/age-slabs/:id').get(getSingleAgeSlab).put(validate(updateAgeSlabSchema), updateAgeSlab).delete(deleteAgeSlab);
router.patch('/age-slabs/:id/status', validate(statusToggleSchema), toggleAgeSlabStatus);

// Family Type Master
router.route('/family-types').post(validate(createFamilyTypeSchema), createFamilyType).get(getAllFamilyTypes);
router.route('/family-types/:id').get(getSingleFamilyType).put(validate(updateFamilyTypeSchema), updateFamilyType).delete(deleteFamilyType);
router.patch('/family-types/:id/status', validate(statusToggleSchema), toggleFamilyTypeStatus);

export default router;
