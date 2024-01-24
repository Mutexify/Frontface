import { Router } from "express";
import { getMeHandler } from "../controllers/user.controller";
import { requireAuthorizedUser } from "../middleware/requireAuthorizedUser";

const router = Router();

router.get("/me", requireAuthorizedUser, getMeHandler);

export default router;
