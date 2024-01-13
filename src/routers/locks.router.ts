import { Router } from "express";
import { handleLockRequest } from "../controllers/locks.controller";
import { requireAuthorizedUser } from "../middleware/requireAuthorizedUser";

const locksRouter = Router();

locksRouter.use(requireAuthorizedUser);
locksRouter.patch("/:id", handleLockRequest);

export { locksRouter };
