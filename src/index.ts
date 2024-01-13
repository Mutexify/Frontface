import cors from "cors";
import dotenv from "dotenv";
import express, { Express } from "express";

import cookieParser from "cookie-parser";
import { subscribeToLockResults } from "./controllers/locks.controller";
import { sseClients } from "./controllers/sse.controller";
import { authRouter } from "./routers/auth.router";
import { locksRouter } from "./routers/locks.router";
import slotsRouter from "./routers/slots.router";
import { sseRouter } from "./routers/sse.router";
import userRouter from "./routers/user.router";

dotenv.config();
const app: Express = express();
app.use(express.json());
app.use(cookieParser());

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN as unknown as string;
app.use(
  cors({
    credentials: true,
    origin: [FRONTEND_ORIGIN],
  })
);

app.use("/api/slots", slotsRouter);
app.use("/api/slots", locksRouter);
app.use("/api/sse", sseRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);

subscribeToLockResults(sseClients);

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
