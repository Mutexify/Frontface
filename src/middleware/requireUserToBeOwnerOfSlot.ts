import { NextFunction, Request, Response } from "express";
import { SlotData } from "../types";
import { prepareCosmosContainer } from "../utils";

export const requireUserToBeOwnerOfSlot = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const container = await prepareCosmosContainer("slots");
    const { resource: slot } = await container
      .item(req.params.id)
      .read<SlotData>();

    if (!slot) {
      return res.status(404).json({
        status: "fail",
        message: "Slot with that ID doesn't exist",
      });
    }

    if (!slot.owners.includes(res.locals.user.email)) {
      return res.status(403).json({
        status: "fail",
        message: "You are not the owner of this slot",
      });
    }

    next();
  } catch (err: any) {
    next(err);
  }
};
