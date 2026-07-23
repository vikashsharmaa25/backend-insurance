/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Common Authentication and User Session Management APIs
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (name + email + phone + dob + gender)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 example: Siddhant Tiwari
 *               email:
 *                 type: string
 *                 format: email
 *                 example: siddhant.tiwari@gmail.com
 *               phone:
 *                 type: string
 *                 example: "9792731575"
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: "1998-05-15"
 *                 description: Date of Birth in YYYY-MM-DD format
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *                 example: MALE
 *                 description: Gender (MALE / FEMALE / OTHER)
 *     responses:
 *       201:
 *         description: User registered successfully.
 *       400:
 *         description: Validation error or phone/email already exists
 */

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP to registered mobile number (Step 1 of login)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9792731575"
 *     responses:
 *       200:
 *         description: OTP sent successfully. Returns demoOtp in response for demo/testing.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     phone:
 *                       type: string
 *                     demoOtp:
 *                       type: string
 *                       example: "482937"
 *                     expiresInMinutes:
 *                       type: number
 *                       example: 5
 *       404:
 *         description: No account found with this phone number
 */

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and complete login (Step 2 of login)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - otp
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9792731575"
 *               otp:
 *                 type: string
 *                 example: "482937"
 *     responses:
 *       200:
 *         description: Login successful. Returns accessToken + refreshToken + user.
 *       400:
 *         description: Invalid or expired OTP
 */

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token (Token Rotation)
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional if sent via cookie
 *     responses:
 *       200:
 *         description: Access token refreshed successfully.
 *       401:
 *         description: Refresh token invalid or missing
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user & clear cookies
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully.
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user details
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User details fetched successfully.
 */

/**
 * @swagger
 * /api/auth/update-profile:
 *   patch:
 *     summary: Update profile details
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Siddhant Tiwari
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 */
