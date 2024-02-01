import { changeStatus } from "../controllers/adminControllers.js";

import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router= Router();

router.route("/change-status/:userId").post(verifyJWT, changeStatus);

export default router;