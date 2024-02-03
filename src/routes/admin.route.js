import { changeStatus, createPassBook, editUserDetails, getAllPassbooks, getAllUsers, getSingleUser } from "../controllers/adminControllers.js";

import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router= Router();
// Changing status from isActive false to true
router.route("/change-status/:userId").post(verifyJWT, changeStatus);

// Creating the passbook of user
router.route("/createPassbook/:userId").post(verifyJWT, createPassBook);

// Getting the details of all user
router.route("/allUsers").get(verifyJWT, getAllUsers);

// Get and edit details of a single user
router.route("/user/:userId")
    .get(verifyJWT, getSingleUser)
    .post(verifyJWT, editUserDetails);

// Get All Passbooks
router.route("/allPassbooks").get(verifyJWT, getAllPassbooks);

export default router;