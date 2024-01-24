import { Router } from "express";
import {
  googleOauthHandler,
  logoutHandler,
} from "../controllers/auth.controller";
import { requireAuthorizedUser } from "../middleware/requireAuthorizedUser";

const authRouter = Router();

authRouter.get("/logout", requireAuthorizedUser, logoutHandler);
authRouter.get("/login/oauth/google", googleOauthHandler);

export { authRouter };
