/**
 * @swagger
 * /api/admin/premium-rates:
 *   post:
 *     summary: Create single premium rate entry (ADMIN Only)
 *     tags: [Premium Rate Matrix]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *               - optionId
 *               - sumInsuredId
 *               - ageSlabId
 *               - familyTypeId
 *               - basePremium
 *             properties:
 *               planId:
 *                 type: string
 *               optionId:
 *                 type: string
 *               sumInsuredId:
 *                 type: string
 *               ageSlabId:
 *                 type: string
 *               familyTypeId:
 *                 type: string
 *               basePremium:
 *                 type: number
 *                 example: 3442
 *               gstPercentage:
 *                 type: number
 *                 example: 18
 *     responses:
 *       201:
 *         description: Rate entry created
 *   get:
 *     summary: Get all premium rate card entries with filters and pagination (ADMIN Only)
 *     tags: [Premium Rate Matrix]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: planId
 *         schema:
 *           type: string
 *       - in: query
 *         name: optionId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sumInsuredId
 *         schema:
 *           type: string
 *       - in: query
 *         name: ageSlabId
 *         schema:
 *           type: string
 *       - in: query
 *         name: familyTypeId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rate card retrieved
 */

/**
 * @swagger
 * /api/admin/premium-rates/bulk:
 *   post:
 *     summary: Bulk upload/upsert premium rate matrix entries (ADMIN Only)
 *     tags: [Premium Rate Matrix]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rates
 *             properties:
 *               rates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     planId:
 *                       type: string
 *                     optionId:
 *                       type: string
 *                     sumInsuredId:
 *                       type: string
 *                     ageSlabId:
 *                       type: string
 *                     familyTypeId:
 *                       type: string
 *                     basePremium:
 *                       type: number
 *     responses:
 *       200:
 *         description: Bulk rates uploaded
 */

/**
 * @swagger
 * /api/admin/premium-rates/{id}:
 *   put:
 *     summary: Update single rate entry (ADMIN Only)
 *     tags: [Premium Rate Matrix]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rate updated
 *   delete:
 *     summary: Soft delete rate entry (ADMIN Only)
 *     tags: [Premium Rate Matrix]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rate deleted
 */

/**
 * @swagger
 * /api/admin/plan-option-coverages:
 *   post:
 *     summary: Map coverage to plan option (ADMIN Only)
 *     tags: [Plan Option Coverages]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *               - optionId
 *               - coverageId
 *             properties:
 *               planId:
 *                 type: string
 *               optionId:
 *                 type: string
 *               coverageId:
 *                 type: string
 *               isCovered:
 *                 type: boolean
 *                 example: true
 *               value:
 *                 type: string
 *                 example: Yes
 *     responses:
 *       200:
 *         description: Coverage mapped
 *   get:
 *     summary: Get coverage matrix for plan options (ADMIN Only)
 *     tags: [Plan Option Coverages]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Matrix fetched
 */

/**
 * @swagger
 * /api/admin/premium/upload-excel:
 *   post:
 *     summary: Bulk Upload Insurance Plans, Options, Coverages, and Rate Cards via Excel file (ADMIN Only)
 *     tags: [Premium Rate Matrix]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file (.xlsx, .xls) containing Plans, Options, Coverages, Coverage Matrix, Sum Insured, Age Slabs, Family Types, and Premium Rates sheets
 *     responses:
 *       200:
 *         description: Excel data imported successfully
 */

/**
 * @swagger
 * /api/admin/premium/download-excel-template:
 *   get:
 *     summary: Download standard Excel Template (.xlsx) with sample data for Bulk Upload (ADMIN Only)
 *     tags: [Premium Rate Matrix]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Downloadable Excel file (.xlsx) template
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
