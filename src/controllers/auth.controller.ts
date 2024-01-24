import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  getGoogleOauthToken,
  getGoogleUser,
} from "../services/googleAuth.service";
import { User } from "../types";
import { prepareCosmosContainer } from "../utils";

export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.cookie("token", "", { maxAge: -1 });
    res.status(200).json({ status: "success" });
  } catch (err: any) {
    next(err);
  }
};

export const googleOauthHandler = async (req: Request, res: Response) => {
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN as unknown as string;

  try {
    const code = req.query.code as string;
    const pathUrl = (req.query.state as string) || "/";

    if (!code) {
      return res.status(401).json({
        status: "fail",
        message: "Authorization code not provided!",
      });
    }

    const { id_token, access_token } = await getGoogleOauthToken({ code });

    const { name, verified_email, email, picture } = await getGoogleUser({
      id_token,
      access_token,
    });

    if (!verified_email) {
      return res.status(403).json({
        status: "fail",
        message: "Google account not verified",
      });
    }

    const container = await prepareCosmosContainer("users");

    const { resource: user } = await container.items.upsert<User>({
      id: email,
      name,
      email,
      photo: picture,
    });

    if (!user) return res.redirect(`${FRONTEND_ORIGIN}/oauth/error`);

    const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN as unknown as number;
    const TOKEN_SECRET = process.env.JWT_SECRET as unknown as string;
    const token = jwt.sign({ sub: user.id }, TOKEN_SECRET, {
      expiresIn: `${TOKEN_EXPIRES_IN}m`,
    });

    res.cookie("token", token, {
      expires: new Date(Date.now() + TOKEN_EXPIRES_IN * 60 * 1000),
      sameSite: "none",
      secure: false, //TODO change to true in production
      httpOnly: true,
      path: "/",
    });

    res.redirect(`${FRONTEND_ORIGIN}${pathUrl}`);
  } catch (err: any) {
    console.log("Failed to authorize Google User", err);
    return res.redirect(`${FRONTEND_ORIGIN}/oauth/error`);
  }
};
