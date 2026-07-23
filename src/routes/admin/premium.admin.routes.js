import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import { uploadExcel } from '../../middleware/upload.middleware.js';
import {
  createPremiumRate,
  bulkCreatePremiumRates,
  getAllPremiumRates,
  updatePremiumRate,
  deletePremiumRate,
  mapPlanCoverage,
  mapPlanCoverageBatch,
  getPlanCoveragesMatrix,
  uploadExcelBulkData,
  downloadExcelTemplate,
} from '../../controllers/admin/premium.admin.controller.js';
import {
  createPremiumRateSchema,
  bulkPremiumRateSchema,
  mapPlanOptionCoverageSchema,
} from '../../validations/admin/premium.admin.validation.js';

const router = Router();

// Protect ALL Admin Premium Matrix & Upload routes for ADMIN users only
router.use(authenticate, authorize('ADMIN'));

// Premium Rate Matrix
router
  .route('/premium-rates')
  .post(validate(createPremiumRateSchema), createPremiumRate)
  .get(getAllPremiumRates);

router.post('/premium-rates/bulk', validate(bulkPremiumRateSchema), bulkCreatePremiumRates);

router
  .route('/premium-rates/:id')
  .put(updatePremiumRate)
  .delete(deletePremiumRate);

// Plan Coverages Matrix
router
  .route('/plan-coverages')
  .post(validate(mapPlanOptionCoverageSchema), mapPlanCoverage)
  .get(getPlanCoveragesMatrix);

router.post('/plan-coverages/batch', mapPlanCoverageBatch);
router.route('/plan-option-coverages').get(getPlanCoveragesMatrix).post(mapPlanCoverage);
router.post('/plan-option-coverages/batch', mapPlanCoverageBatch);

// Excel Bulk Upload & Download
router.post('/premium/upload-excel', uploadExcel.single('file'), uploadExcelBulkData);
router.get('/premium/download-excel-template', downloadExcelTemplate);

export default router;
