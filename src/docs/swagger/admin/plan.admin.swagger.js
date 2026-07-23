/**
 * @swagger
 * /api/admin/plans:
 *   post:
 *     summary: Create a new Insurance Plan (ADMIN Only)
 *     tags: [Insurance Plans]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Comprehensive Health Plan
 *               slug:
 *                 type: string
 *                 example: comprehensive-health-plan
 *               shortDescription:
 *                 type: string
 *                 example: Full coverage health insurance for families
 *               description:
 *                 type: string
 *                 example: Detailed insurance policy description
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *               slabs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Age Slab IDs
 *                 example: ["65d1a2b3c4d5e6f7a8b9c0d1", "65d1a2b3c4d5e6f7a8b9c0d2"]
 *               ageSlabs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Age Slab IDs
 *               sumInsuredSlabs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Sum Insured Slab IDs
 *     responses:
 *       201:
 *         description: Plan created successfully
 *   get:
 *     summary: Get all Insurance Plans with search and pagination (ADMIN Only)
 *     tags: [Insurance Plans]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Plans fetched successfully
 */

/**
 * @swagger
 * /api/admin/plans/{id}:
 *   get:
 *     summary: Get single Insurance Plan by ID (ADMIN Only)
 *     tags: [Insurance Plans]
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
 *         description: Plan details fetched
 *   put:
 *     summary: Update Insurance Plan by ID (ADMIN Only)
 *     tags: [Insurance Plans]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               shortDescription:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               slabs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Age Slab IDs
 *               ageSlabs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Age Slab IDs
 *               sumInsuredSlabs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Sum Insured Slab IDs
 *     responses:
 *       200:
 *         description: Plan updated successfully
 *   delete:
 *     summary: Soft delete Insurance Plan by ID (ADMIN Only)
 *     tags: [Insurance Plans]
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
 *         description: Plan deleted successfully
 */

/**
 * @swagger
 * /api/admin/plans/{id}/status:
 *   patch:
 *     summary: Activate/Deactivate Insurance Plan (ADMIN Only)
 *     tags: [Insurance Plans]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Plan status updated
 */

/**
 * @swagger
 * /api/admin/coverages:
 *   post:
 *     summary: Create Coverage Master (ADMIN Only)
 *     tags: [Coverage Master]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Hospitalisation Expenses
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *     responses:
 *       201:
 *         description: Coverage created
 *   get:
 *     summary: Get Coverages Master List (ADMIN Only)
 *     tags: [Coverage Master]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Coverages fetched
 */

/**
 * @swagger
 * /api/admin/sum-insured:
 *   post:
 *     summary: Create Sum Insured Master (ADMIN Only)
 *     tags: [Sum Insured Master]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - displayName
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 500000
 *               displayName:
 *                 type: string
 *                 example: 5 Lakhs
 *     responses:
 *       201:
 *         description: Sum Insured created
 *   get:
 *     summary: Get Sum Insured Slabs List (ADMIN Only)
 *     tags: [Sum Insured Master]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sum Insured list fetched
 */

/**
 * @swagger
 * /api/admin/age-slabs:
 *   post:
 *     summary: Create Age Slab Master (ADMIN Only)
 *     tags: [Age Slab Master]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - minAge
 *               - maxAge
 *               - displayName
 *             properties:
 *               minAge:
 *                 type: integer
 *                 example: 18
 *               maxAge:
 *                 type: integer
 *                 example: 25
 *               displayName:
 *                 type: string
 *                 example: 18-25 Years
 *     responses:
 *       201:
 *         description: Age slab created
 *   get:
 *     summary: Get Age Slabs List (ADMIN Only)
 *     tags: [Age Slab Master]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Age slabs fetched
 */

/**
 * @swagger
 * /api/admin/family-types:
 *   post:
 *     summary: Create Family Type Master (ADMIN Only)
 *     tags: [Family Type Master]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - adultCount
 *               - childCount
 *             properties:
 *               name:
 *                 type: string
 *                 example: 1 Adult + 1 Kid
 *               code:
 *                 type: string
 *                 example: 1A+1K
 *               adultCount:
 *                 type: integer
 *                 example: 1
 *               childCount:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Family Type created
 *   get:
 *     summary: Get Family Types List (ADMIN Only)
 *     tags: [Family Type Master]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Family types fetched
 */
