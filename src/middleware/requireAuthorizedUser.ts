import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../types";
import { prepareCosmosContainer, userFromDBResponse } from "../utils";

export const requireAuthorizedUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "You are not logged in",
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET as unknown as string;
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid token or user doesn't exist",
      });
    }

    const container = await prepareCosmosContainer("users");

    const { resource: user } = await container
      .item(String(decoded.sub))
      .read<User>();

    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "User with that token no longer exist",
      });
    }

    res.locals.user = userFromDBResponse(user);

    next();
  } catch (err: any) {
    next(err);
  }
};
