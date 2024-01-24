import { Router } from "express";
import {
  getSseClientsHandler,
  subscribeToEventsHandler,
} from "../controllers/sse.controller";
const sseRouter = Router();

sseRouter.get("/clients", getSseClientsHandler);
sseRouter.get("/events", subscribeToEventsHandler);

export { sseRouter };
