import { CosmosClient } from "@azure/cosmos";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";

dotenv.config();

const app: Express = express();
app.use(express.json());
const port = process.env.PORT || 3000;

const cosmos_endpoint = process.env.COSMOS_ENDPOINT;
const cosmos_key = process.env.COSMOS_KEY;
if (!cosmos_endpoint || !cosmos_key) {
  throw new Error("Cosmos DB credentials missing");
}
const client = new CosmosClient({ endpoint: cosmos_endpoint, key: cosmos_key });

async function prepareContainer() {
  const { database } = await client.databases.createIfNotExists({
    id: "mutexio",
  });
  const { container } = await database.containers.createIfNotExists({
    id: "slots",
  });
  return container;
}

// TODO implement GUI here
app.get("/", async (req: Request, res: Response) => {
  const container = await prepareContainer();
  const items = await container.items.readAll().fetchAll();
  res.send(`items: ${items.resources}`);
});

app.get("/slots", async (req: Request, res: Response) => {
  const container = await prepareContainer();
  const items = await container.items.readAll().fetchAll();
  res.json(items.resources);
});

app.post("/slots", async (req: Request, res: Response) => {
  const container = await prepareContainer();
  const item = {
    owner: req.body.owner,
    resourceUri: req.body.resourceUri,
    blocked: false,
  };
  const created = await container.items.create(item);

  res.status(201).json(created.resource);
});

app.put("/slots/:id", async (req: Request, res: Response) => {
  const container = await prepareContainer();
  const item = {
    id: req.params.id,
    owner: req.body.owner,
    resourceUri: req.body.resourceUri,
    blocked: req.body.blocked,
  };
  const updated = await container.item(req.params.id).replace(item);

  res.json(updated.resource);
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
