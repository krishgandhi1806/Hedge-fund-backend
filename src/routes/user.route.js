import { Router } from "express";
import { registerUser, loginUser, logoutUser, sendOtpToVerifyEmail, verifyEMail } from "../controllers/userController.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router= Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);

// Protected Route
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/sendOtp").post(verifyJWT, sendOtpToVerifyEmail);
router.route("/verifyUser").post(verifyJWT, verifyEMail);
export default router;