/**
 * @swagger
 * /api/admin/applications:
 *   get:
 *     summary: Get all Customer Policy Applications with search, status filter and pagination (ADMIN Only)
 *     tags: [Policy Applications Management]
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
 *           enum: [PENDING_APPROVAL, APPROVED, REJECTED, POLICY_ISSUED]
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
 *         description: Applications list fetched
 */

/**
 * @swagger
 * /api/admin/applications/{id}:
 *   get:
 *     summary: Get single Customer Policy Application full audit details (ADMIN Only)
 *     tags: [Policy Applications Management]
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
 *         description: Full application audit details fetched
 */

/**
 * @swagger
 * /api/admin/applications/{id}/status:
 *   patch:
 *     summary: Approve or Reject Customer Policy Application & Issue Policy Certificate (ADMIN Only)
 *     tags: [Policy Applications Management]
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
 *                 enum: [APPROVED, REJECTED]
 *                 example: APPROVED
 *               rejectionReason:
 *                 type: string
 *                 example: Pre-existing medical condition exceeds coverage limit
 *     responses:
 *       200:
 *         description: Application status updated & Policy Issued if approved
 */
