/**
 * @swagger
 * /api/customer/dashboard:
 *   get:
 *     summary: Mobile App Dashboard - Featured Plans, Minimum Prices (DOB & Age Slab based), Coverages & Sum Insured Slabs
 *     tags: [Customer Mobile App - Home & Explore]
 *     parameters:
 *       - in: query
 *         name: dob
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Optional customer Date of Birth (YYYY-MM-DD) to dynamically calculate user age and match rate slab
 *         example: "2004-05-15"
 *       - in: query
 *         name: age
 *         schema:
 *           type: integer
 *         required: false
 *         description: Optional customer age in years to dynamically match rate slab
 *         example: 22
 *     responses:
 *       200:
 *         description: Dashboard data fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Customer dashboard data fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         _id:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         kycStatus:
 *                           type: string
 *                           example: "pending"
 *                     featuredPlans:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "6a6262a97e6d9b6b47ea2a0c"
 *                           name:
 *                             type: string
 *                             example: "basic plan"
 *                           slug:
 *                             type: string
 *                             example: "basic-plan"
 *                           shortDescription:
 *                             type: string
 *                             example: "this short summary for basic plan"
 *                           calculatedAge:
 *                             type: integer
 *                             example: 18
 *                           matchedAgeSlab:
 *                             type: string
 *                             example: "18-25"
 *                           sumInsured:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               displayName:
 *                                 type: string
 *                                 example: "3 Lakhs"
 *                               amount:
 *                                 type: number
 *                                 example: 300000
 *                           basePrice:
 *                             type: number
 *                             description: Minimum base price entered in admin (Excl. GST) for customer's age slab
 *                             example: 1000
 *                           minPrice:
 *                             type: number
 *                             description: Starting minimum price
 *                             example: 1000
 *                           startingPrice:
 *                             type: number
 *                             description: Starting minimum price
 *                             example: 1000
 *                           priceWithGst:
 *                             type: number
 *                             description: Total minimum price inclusive of GST
 *                             example: 1180
 *                           gstPercentage:
 *                             type: number
 *                             example: 18
 *                           coverages:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 _id:
 *                                   type: string
 *                                 title:
 *                                   type: string
 *                                 description:
 *                                   type: string
 *                                 icon:
 *                                   type: string
 *                                 isCovered:
 *                                   type: boolean
 *                                 value:
 *                                   type: string
 */

/**
 * @swagger
 * /api/customer/plans/{id}:
 *   get:
 *     summary: Get Single Insurance Plan Details on basis of DOB, Sum Insured & Family Type
 *     tags: [Customer Mobile App - Home & Explore]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Plan ObjectId
 *         example: "6a6262a97e6d9b6b47ea2a0c"
 *       - in: query
 *         name: dob
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Customer Date of Birth (YYYY-MM-DD) to calculate age & match age slab
 *         example: "1995-08-15"
 *       - in: query
 *         name: age
 *         schema:
 *           type: integer
 *         required: false
 *         description: Customer age in years
 *         example: 30
 *     responses:
 *       200:
 *         description: Plan details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Plan details fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     plan:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         slug:
 *                           type: string
 *                         shortDescription:
 *                           type: string
 *                         description:
 *                           type: string
 *                         logo:
 *                           type: string
 *                         status:
 *                           type: string
 *                     calculatedAge:
 *                       type: integer
 *                       example: 30
 *                     dob:
 *                       type: string
 *                       example: "1995-08-15"
 *                     matchedAgeSlab:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         displayName:
 *                           type: string
 *                           example: "26-30"
 *                         minAge:
 *                           type: integer
 *                         maxAge:
 *                           type: integer
 *                     selectedSumInsured:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         displayName:
 *                           type: string
 *                         amount:
 *                           type: number
 *                     selectedFamilyType:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         code:
 *                           type: string
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         basePremium:
 *                           type: number
 *                           example: 1200
 *                         gstPercentage:
 *                           type: number
 *                           example: 18
 *                         gstAmount:
 *                           type: number
 *                           example: 216
 *                         totalPremium:
 *                           type: number
 *                           example: 1416
 *                     sumInsuredOptions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           basePremium:
 *                             type: number
 *                           gstPercentage:
 *                             type: number
 *                           gstAmount:
 *                             type: number
 *                           totalPremium:
 *                             type: number
 *                     familyTypeOptions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     coverages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           coverageId:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           icon:
 *                             type: string
 *                           category:
 *                             type: string
 *                           isCovered:
 *                             type: boolean
 *                           value:
 *                             type: string
 *                     keyHighlights:
 *                       type: array
 *                       items:
 *                         type: string
 *       404:
 *         description: Insurance Plan not found
 */

/**
 * @swagger
 * /api/customer/explore-plans:
 *   post:
 *     summary: Explore Plans & Calculate Dynamic Quotes (Input DOB, Family Type, Sum Insured)
 *     tags: [Customer Mobile App - Home & Explore]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dob
 *               - familyTypeId
 *               - sumInsuredId
 *             properties:
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: "1998-05-15"
 *               familyTypeId:
 *                 type: string
 *                 example: 60c72b2f9b1d8b2e88a12349
 *               sumInsuredId:
 *                 type: string
 *                 example: 60c72b2f9b1d8b2e88a12347
 *               planId:
 *                 type: string
 *                 example: 60c72b2f9b1d8b2e88a12345
 *     responses:
 *       200:
 *         description: Matching plans and calculated premium quotes fetched
 */

/**
 * @swagger
 * /api/customer/kyc:
 *   post:
 *     summary: Submit Customer KYC Verification Details (DOB, Gender, PAN, Aadhaar, Address)
 *     tags: [Customer Mobile App - KYC & Profile]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dob
 *               - gender
 *             properties:
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: "1995-10-20"
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *                 example: MALE
 *               panNumber:
 *                 type: string
 *                 example: ABCDE1234F
 *               aadhaarNumber:
 *                 type: string
 *                 example: "123456789012"
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: Main Street
 *                   city:
 *                     type: string
 *                     example: Mumbai
 *                   state:
 *                     type: string
 *                     example: Maharashtra
 *                   pincode:
 *                     type: string
 *                     example: "400001"
 *     responses:
 *       200:
 *         description: KYC details submitted and verified
 *   get:
 *     summary: Get Customer KYC Status & Profile Info
 *     tags: [Customer Mobile App - KYC & Profile]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: KYC status fetched
 */

/**
 * @swagger
 * /api/customer/proposals:
 *   post:
 *     summary: Submit Policy Purchase Proposal (Insured Family Members & Nominee)
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
 *               - insuredMembers
 *               - nominee
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
 *               insuredMembers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     relation:
 *                       type: string
 *                       example: Self
 *                     dob:
 *                       type: string
 *                       format: date
 *                       example: "1995-10-20"
 *                     gender:
 *                       type: string
 *                       enum: [MALE, FEMALE, OTHER]
 *                       example: MALE
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
 *     responses:
 *       201:
 *         description: Proposal created and policy activated
 */

/**
 * @swagger
 * /api/customer/my-policies:
 *   get:
 *     summary: Get All Purchased Active Customer Policies List
 *     tags: [Customer Mobile App - Proposals & My Policies]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: My policies list fetched
 */

/**
 * @swagger
 * /api/customer/my-policies/{id}:
 *   get:
 *     summary: Get Single Purchased Policy Details with Coverages & Policy Terms Wording
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
 *         description: Policy details fetched
 */
