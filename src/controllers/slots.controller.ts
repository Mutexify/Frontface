import { Request, Response } from "express";
import { SlotData } from "../types";
import { prepareCosmosContainer, slotDataFromDBResponse } from "../utils";

export async function getAllSlotsHandler(req: Request, res: Response) {
  const container = await prepareCosmosContainer("slots");
  const items = await container.items.readAll<SlotData>().fetchAll();
  const slots = items.resources.map((item) => slotDataFromDBResponse(item));
  res.json(slots);
}

export async function createSlotHandler(req: Request, res: Response) {
  const container = await prepareCosmosContainer("slots");
  const item = {
    // owner: req.body.owner,
    // resourceUri: req.body.resourceUri,
    blocked: false,
  };
  const created = await container.items.create(item);

  res.status(201).json(created.resource);
}
