import crypto from 'crypto';
import Razorpay from 'razorpay';
import { PolicyProposal } from '../../models/policyProposal.model.js';
import { PolicyApplication } from '../../models/policyApplication.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_TFjtEEh5bH5JCD';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rKHs91j1cfVt7S3wWC5wd76H';
  return new Razorpay({ key_id, key_secret });
};

// ==========================================
// 1. CREATE RAZORPAY ORDER FOR PROPOSAL
// ==========================================
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { proposalId } = req.body;

  if (!proposalId) {
    throw new ApiError(400, 'Proposal ID is required');
  }

  const proposal = await PolicyProposal.findOne({
    _id: proposalId,
    userId: req.user._id,
    isDeleted: false,
  })
    .populate('planId', 'name')
    .populate('sumInsuredId', 'displayName amount');

  if (!proposal) {
    throw new ApiError(404, 'Policy proposal not found');
  }

  if (['active', 'APPROVED', 'POLICY_ISSUED'].includes(proposal.status)) {
    throw new ApiError(400, 'Payment has already been completed and policy is active for this proposal.');
  }

  const totalPremium = proposal.pricing?.totalPremium || 0;
  if (totalPremium <= 0) {
    throw new ApiError(400, 'Invalid proposal amount for payment');
  }

  // Amount in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(totalPremium * 100);

  const razorpay = getRazorpayInstance();
  const receiptId = `rcpt_${proposal.proposalNumber || proposal._id.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;

  const options = {
    amount: amountInPaise,
    currency: 'INR',
    receipt: receiptId,
    notes: {
      proposalId: proposal._id.toString(),
      proposalNumber: proposal.proposalNumber || '',
      userId: req.user._id.toString(),
      userEmail: req.user.email || '',
      planName: proposal.planId?.name || 'Health Policy',
    },
  };

  const order = await razorpay.orders.create(options);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TFjtEEh5bH5JCD',
        proposalId: proposal._id,
        proposalNumber: proposal.proposalNumber,
        planName: proposal.planId?.name,
        userEmail: req.user.email,
        userName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
        userPhone: req.user.phone || '',
      },
      'Razorpay order created successfully'
    )
  );
});

// ==========================================
// 2. VERIFY RAZORPAY PAYMENT & ISSUE POLICY
// ==========================================
export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    proposalId,
    paymentMode = 'UPI',
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !proposalId) {
    throw new ApiError(400, 'Missing required payment verification parameters');
  }

  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'rKHs91j1cfVt7S3wWC5wd76H';

  // Verify HMAC SHA256 Signature
  const generatedSignature = crypto
    .createHmac('sha256', key_secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    throw new ApiError(400, 'Payment verification failed: Invalid signature');
  }

  // Fetch proposal
  const proposal = await PolicyProposal.findOne({
    _id: proposalId,
    userId: req.user._id,
    isDeleted: false,
  })
    .populate('planId', 'name slug shortDescription logo')
    .populate('sumInsuredId', 'displayName amount')
    .populate('familyTypeId', 'name code')
    .populate('ageSlabId', 'displayName');

  if (!proposal) {
    throw new ApiError(404, 'Policy proposal not found');
  }

  // Generate Policy Number if not present
  const policyNumber = proposal.policyNumber || `POL-ICICI-${Math.floor(10000000 + Math.random() * 90000000)}`;

  // Update PolicyProposal
  proposal.status = 'active';
  proposal.policyNumber = policyNumber;
  proposal.startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);
  proposal.endDate = endDate;
  await proposal.save();

  // Create PolicyApplication record for history/admin tracking
  const applicationNumber = `APP-ICICI-${Math.floor(100000 + Math.random() * 900000)}`;

  let application = await PolicyApplication.findOne({
    userId: req.user._id,
    planId: proposal.planId._id,
    isDeleted: false,
  });

  if (!application) {
    application = new PolicyApplication({
      applicationNumber,
      policyNumber,
      userId: req.user._id,
      planId: proposal.planId._id,
      sumInsuredId: proposal.sumInsuredId._id,
      ageSlabId: proposal.ageSlabId._id,
      familyTypeId: proposal.familyTypeId._id,
      applicantDetails: {
        fullName: proposal.masterMember?.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
        email: req.user.email,
        phone: req.user.phone || '',
        dob: proposal.masterMember?.dob || new Date('1995-01-01'),
        gender: 'MALE',
        aadhaarNumber: proposal.masterMember?.aadhaar || '',
      },
      insuredMembers: proposal.insuredMembers || [],
      nominee: proposal.nominee || { name: 'Nominee', relation: 'Spouse', age: 30 },
      pricing: proposal.pricing,
      paymentDetails: {
        transactionId: razorpay_payment_id,
        paymentMode,
        paymentStatus: 'SUCCESS',
        paidAmount: proposal.pricing?.totalPremium || 0,
        paidAt: new Date(),
      },
      status: 'POLICY_ISSUED',
      policyStartDate: proposal.startDate,
      policyExpiryDate: proposal.endDate,
    });
  } else {
    application.policyNumber = policyNumber;
    application.paymentDetails = {
      transactionId: razorpay_payment_id,
      paymentMode,
      paymentStatus: 'SUCCESS',
      paidAmount: proposal.pricing?.totalPremium || 0,
      paidAt: new Date(),
    };
    application.status = 'POLICY_ISSUED';
    application.policyStartDate = proposal.startDate;
    application.policyExpiryDate = proposal.endDate;
  }
  await application.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        policyNumber,
        proposalId: proposal._id,
        applicationId: application._id,
        status: 'active',
        paymentStatus: 'SUCCESS',
        transactionId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        plan: proposal.planId,
        sumInsured: proposal.sumInsuredId,
        masterMember: proposal.masterMember,
        pricing: proposal.pricing,
        startDate: proposal.startDate,
        endDate: proposal.endDate,
      },
      'Payment verified successfully and Policy activated!'
    )
  );
});
