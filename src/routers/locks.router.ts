import { Router } from "express";
import { handleLockRequest } from "../controllers/locks.controller";

const locksRouter = Router();

locksRouter.patch("/:id", handleLockRequest);

export { locksRouter };
