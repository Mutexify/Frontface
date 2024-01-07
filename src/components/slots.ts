import { Request, Response, Router } from "express";
import { prepareCosmosContainer, slotDataFromDBResponse } from "../helpers";
const slotsRouter = Router();

slotsRouter.get("/", async (req: Request, res: Response) => {
  const container = await prepareCosmosContainer();
  const items = await container.items.readAll().fetchAll();
  const slots = items.resources.map((item) => slotDataFromDBResponse(item));
  res.json(slots);
});

slotsRouter.post("/", async (req: Request, res: Response) => {
  const container = await prepareCosmosContainer();
  const item = {
    // owner: req.body.owner,
    // resourceUri: req.body.resourceUri,
    blocked: false,
  };
  const created = await container.items.create(item);

  res.status(201).json(created.resource);
});

export default slotsRouter;
