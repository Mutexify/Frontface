import { Router } from "express";
import {
  createSlotHandler,
  getAllSlotsHandler,
} from "../controllers/slots.controller";
import { requireAuthorizedUser } from "../middleware/requireAuthorizedUser";
const slotsRouter = Router();

slotsRouter.use(requireAuthorizedUser);
slotsRouter.get("/", getAllSlotsHandler);
slotsRouter.post("/", createSlotHandler);

export default slotsRouter;
