/**
 * @swagger
 * /api/admin/policy-conditions:
 *   post:
 *     summary: Set or update Policy Terms, Sub-limits, and Exclusions for a Plan (ADMIN Only)
 *     tags: [Policy Conditions Master]
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
 *             properties:
 *               planId:
 *                 type: string
 *                 example: 60c72b2f9b1d8b2e88a12345
 *               roomRentLimit:
 *                 type: string
 *                 example: Up to 2% for normal room and up to 4% for ICU
 *               ambulanceCoverLimit:
 *                 type: number
 *                 example: 3000
 *               maternityLimit:
 *                 type: number
 *                 example: 40000
 *               coPayPercentage:
 *                 type: number
 *                 example: 10
 *               initialWaitingPeriodDays:
 *                 type: integer
 *                 example: 30
 *               diseaseSubLimits:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     diseaseName:
 *                       type: string
 *                       example: Cataract per eye
 *                     limitAmount:
 *                       type: number
 *                       example: 30000
 *     responses:
 *       200:
 *         description: Policy terms set successfully
 */

/**
 * @swagger
 * /api/admin/policy-conditions/seed:
 *   post:
 *     summary: Seed sample Policy Wording & Sub-limits document into database (ADMIN Only)
 *     tags: [Policy Conditions Master]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Policy conditions document seeded successfully
 */

/**
 * @swagger
 * /api/admin/policy-conditions/{id}:
 *   delete:
 *     summary: Soft delete Policy Condition entry (ADMIN Only)
 *     tags: [Policy Conditions Master]
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
 *         description: Record deleted
 */
