import cors from "cors";
import dotenv from "dotenv";
import express, { Express } from "express";

import { subscribeToLockResults } from "./controllers/locks.controller";
import { sseClients } from "./controllers/sse.controller";
import { locksRouter } from "./routers/locks.router";
import slotsRouter from "./routers/slots.router";
import { sseRouter } from "./routers/sse.router";

dotenv.config();
const app: Express = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT;

app.use("/api/slots", slotsRouter);
app.use("/api/slots", locksRouter);
app.use("/api/sse", sseRouter);

subscribeToLockResults(sseClients);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
