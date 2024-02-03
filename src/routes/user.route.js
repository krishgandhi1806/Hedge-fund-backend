import { Router } from "express";
import { registerUser, loginUser, logoutUser, sendOtpToVerifyEmail, verifyEMail, changePassword, forgotPassword, resetPassword, getUserDetails, getPassbook, editDetails } from "../controllers/userController.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
const router= Router();

// Register user
router.route("/register").post(registerUser);

// login User
router.route("/login").post(loginUser);

// Protected Route

// Logout
router.route("/logout").post(verifyJWT, logoutUser);

// Sending OTP
router.route("/sendOtp").post(verifyJWT, sendOtpToVerifyEmail);

// Verify Email
router.route("/verifyUser").post(verifyJWT, verifyEMail);

// Change Password
router.route("/changePassword").post(verifyJWT,  changePassword);

// Get and edit details
router.route("/details")
    .get(verifyJWT, getUserDetails)
    .post(verifyJWT, editDetails);

// Forgot Password Routes
router.route("/forgotPassword").post(forgotPassword);
router.route("/resetPassword/:token").post(resetPassword);
export default router;

// Get Passbook
router.route("/passbook").get(verifyJWT, getPassbook);
