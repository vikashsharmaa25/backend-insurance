/**
 * @swagger
 * /api/admin/premium-rates:
 *   post:
 *     summary: Create single premium rate entry (ADMIN Only)
 *     description: Creates a premium rate for a plan × sum insured × age slab × family type combination. optionId is no longer required.
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
 *               - sumInsuredId
 *               - ageSlabId
 *               - familyTypeId
 *               - basePremium
 *             properties:
 *               planId:
 *                 type: string
 *                 example: "6a620a48b6129bd44f5f7b3e"
 *               sumInsuredId:
 *                 type: string
 *                 example: "6a61fe682235083d351a62bc"
 *               ageSlabId:
 *                 type: string
 *                 example: "6a61fe6a2235083d351a62c4"
 *               familyTypeId:
 *                 type: string
 *                 example: "6a61fe6c2235083d351a62d6"
 *               basePremium:
 *                 type: number
 *                 example: 3442
 *               gstPercentage:
 *                 type: number
 *                 example: 18
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *     responses:
 *       201:
 *         description: Rate entry created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate rate entry for same parameters
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
 *         description: Filter by plan ID
 *       - in: query
 *         name: sumInsuredId
 *         schema:
 *           type: string
 *         description: Filter by sum insured slab ID
 *       - in: query
 *         name: ageSlabId
 *         schema:
 *           type: string
 *         description: Filter by age slab ID
 *       - in: query
 *         name: familyTypeId
 *         schema:
 *           type: string
 *         description: Filter by family type ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Rate card entries retrieved successfully
 */

/**
 * @swagger
 * /api/admin/premium-rates/bulk:
 *   post:
 *     summary: Bulk upload/upsert premium rate matrix entries (ADMIN Only)
 *     description: Upsert multiple rate entries in one request. optionId is optional and ignored.
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
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - planId
 *                     - sumInsuredId
 *                     - ageSlabId
 *                     - familyTypeId
 *                     - basePremium
 *                   properties:
 *                     planId:
 *                       type: string
 *                     sumInsuredId:
 *                       type: string
 *                     ageSlabId:
 *                       type: string
 *                     familyTypeId:
 *                       type: string
 *                     basePremium:
 *                       type: number
 *                     gstPercentage:
 *                       type: number
 *                       default: 18
 *     responses:
 *       200:
 *         description: Bulk rates upserted successfully
 *       400:
 *         description: Validation error or empty rates array
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
 *         description: Premium rate document ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               basePremium:
 *                 type: number
 *               gstPercentage:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Rate updated successfully
 *       404:
 *         description: Rate entry not found
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
 *         description: Rate entry soft-deleted
 *       404:
 *         description: Rate entry not found
 */

/**
 * @swagger
 * /api/admin/plan-coverages:
 *   post:
 *     summary: Map a coverage to a plan for a specific sum insured slab (ADMIN Only)
 *     description: |
 *       Saves a coverage mapping for a plan × sum insured slab combination.
 *       This replaces the old plan-option-coverages model.
 *       If sumInsuredId is omitted, the mapping applies globally to the plan.
 *     tags: [Plan Coverage Matrix]
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
 *               - coverageId
 *             properties:
 *               planId:
 *                 type: string
 *                 example: "6a620a48b6129bd44f5f7b3e"
 *               coverageId:
 *                 type: string
 *                 example: "6a61fe682235083d351a62bc"
 *               sumInsuredId:
 *                 type: string
 *                 nullable: true
 *                 description: Sum insured slab ID. If null, mapping is plan-global.
 *                 example: "6a61fe682235083d351a62bc"
 *               isCovered:
 *                 type: boolean
 *                 example: true
 *               value:
 *                 type: string
 *                 example: "Yes"
 *     responses:
 *       200:
 *         description: Coverage mapping saved
 *       400:
 *         description: Validation error
 *   get:
 *     summary: Get coverage matrix for a plan (ADMIN Only)
 *     description: Returns all coverage mappings for a plan. Optionally filter by sumInsuredId.
 *     tags: [Plan Coverage Matrix]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *         description: Filter by plan ID
 *       - in: query
 *         name: sumInsuredId
 *         schema:
 *           type: string
 *         description: (Optional) filter by sum insured slab ID
 *     responses:
 *       200:
 *         description: Coverage matrix fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       planId:
 *                         type: object
 *                       coverageId:
 *                         type: object
 *                       sumInsuredId:
 *                         type: object
 *                         nullable: true
 *                       isCovered:
 *                         type: boolean
 *                       value:
 *                         type: string
 */

/**
 * @swagger
 * /api/admin/plan-coverages/batch:
 *   post:
 *     summary: Batch save coverage matrix for a plan (ADMIN Only)
 *     description: |
 *       Upserts multiple coverage × sum insured slab mappings for a plan in one request.
 *       Each entry in the coverages array can have a different sumInsuredId.
 *     tags: [Plan Coverage Matrix]
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
 *               - coverages
 *             properties:
 *               planId:
 *                 type: string
 *                 example: "6a620a48b6129bd44f5f7b3e"
 *               coverages:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - coverageId
 *                     - isCovered
 *                   properties:
 *                     coverageId:
 *                       type: string
 *                     sumInsuredId:
 *                       type: string
 *                       nullable: true
 *                       description: Sum insured slab ID. Null = plan-global.
 *                     isCovered:
 *                       type: boolean
 *                     value:
 *                       type: string
 *                       example: "Yes"
 *     responses:
 *       200:
 *         description: Coverage matrix batch saved
 *       400:
 *         description: Missing planId or coverages array
 */

/**
 * @swagger
 * /api/admin/premium/upload-excel:
 *   post:
 *     summary: Bulk Upload Insurance Plans, Coverages, and Rate Cards via Excel file (ADMIN Only)
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
 *                 description: Excel file (.xlsx, .xls) containing Plans, Coverages, Coverage Matrix, Sum Insured, Age Slabs, Family Types, and Premium Rates sheets
 *     responses:
 *       200:
 *         description: Excel data imported successfully
 *       400:
 *         description: No file uploaded or invalid file format
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
