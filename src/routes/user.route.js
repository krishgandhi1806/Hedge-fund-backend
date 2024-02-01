import { Router } from "express";
import { registerUser, loginUser, logoutUser, sendOtpToVerifyEmail, verifyEMail, changePassword, forgotPassword, resetPassword, getUserDetails, getPassbook } from "../controllers/userController.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
const router= Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);

// Protected Route
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/sendOtp").post(verifyJWT, sendOtpToVerifyEmail);
router.route("/verifyUser").post(verifyJWT, verifyEMail);
router.route("/changePassword").post(verifyJWT,  changePassword);
router.route("/details").get(verifyJWT, getUserDetails);
router.route("/passbook").post(verifyJWT, getPassbook);

// Forgot Password Routes
router.route("/forgotPassword").post(forgotPassword);
router.route("/resetPassword/:token").post(resetPassword);
export default router;