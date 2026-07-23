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
  mapPlanOptionCoverage,
  mapPlanOptionCoverageBatch,
  getOptionCoveragesMatrix,
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

// Plan Option Coverages Matrix
router
  .route('/plan-option-coverages')
  .post(validate(mapPlanOptionCoverageSchema), mapPlanOptionCoverage)
  .get(getOptionCoveragesMatrix);

router.post('/plan-option-coverages/batch', mapPlanOptionCoverageBatch);

// Excel Bulk Upload & Download
router.post('/premium/upload-excel', uploadExcel.single('file'), uploadExcelBulkData);
router.get('/premium/download-excel-template', downloadExcelTemplate);

export default router;
