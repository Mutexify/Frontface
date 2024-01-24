import { Router } from "express";
import { handleLockRequest } from "../controllers/locks.controller";
import { requireAuthorizedUser } from "../middleware/requireAuthorizedUser";
import { requireUserToBeOwnerOfSlot } from "../middleware/requireUserToBeOwnerOfSlot";

const locksRouter = Router();

locksRouter.use(requireAuthorizedUser);
locksRouter.patch("/:id", requireUserToBeOwnerOfSlot, handleLockRequest);

export { locksRouter };
