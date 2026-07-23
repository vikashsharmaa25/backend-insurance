/**
 * @swagger
 * /api/customer/applications:
 *   post:
 *     summary: Apply for a new Insurance Policy (Submit Applicant, Insured Members, Nominee & Payment)
 *     tags: [Customer Mobile App - Proposals & My Policies]
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
 *               - applicantDetails
 *               - insuredMembers
 *               - nominee
 *               - paymentDetails
 *             properties:
 *               planId:
 *                 type: string
 *               optionId:
 *                 type: string
 *                 nullable: true
 *                 description: (Optional) Option ID
 *               sumInsuredId:
 *                 type: string
 *               ageSlabId:
 *                 type: string
 *               familyTypeId:
 *                 type: string
 *               applicantDetails:
 *                 type: object
 *                 properties:
 *                   fullName:
 *                     type: string
 *                     example: John Doe
 *                   email:
 *                     type: string
 *                     example: john.doe@example.com
 *                   phone:
 *                     type: string
 *                     example: "+1234567890"
 *                   dob:
 *                     type: string
 *                     format: date
 *                     example: "1995-10-20"
 *                   gender:
 *                     type: string
 *                     enum: [MALE, FEMALE, OTHER]
 *                     example: MALE
 *               insuredMembers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     relation:
 *                       type: string
 *                     dob:
 *                       type: string
 *                       format: date
 *                     gender:
 *                       type: string
 *                     hasPreExistingDisease:
 *                       type: boolean
 *                       example: false
 *               nominee:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: Jane Doe
 *                   relation:
 *                     type: string
 *                     example: Spouse
 *                   age:
 *                     type: number
 *                     example: 28
 *               paymentDetails:
 *                 type: object
 *                 properties:
 *                   transactionId:
 *                     type: string
 *                     example: TXN123456789
 *                   paymentMode:
 *                     type: string
 *                     enum: [UPI, NET_BANKING, CREDIT_CARD, DEBIT_CARD, WALLET]
 *                     example: UPI
 *                   paidAmount:
 *                     type: number
 *                     example: 4061.56
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *   get:
 *     summary: Track Customer Submitted Policy Applications List
 *     tags: [Customer Mobile App - Proposals & My Policies]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_APPROVAL, APPROVED, REJECTED, POLICY_ISSUED]
 *     responses:
 *       200:
 *         description: Applications list fetched
 */

/**
 * @swagger
 * /api/customer/applications/{id}:
 *   get:
 *     summary: Get Single Policy Application Details & Status Track
 *     tags: [Customer Mobile App - Proposals & My Policies]
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
 *         description: Application details fetched
 */
