import { CosmosClient } from "@azure/cosmos";
import { ServiceBusClient, ServiceBusMessage } from "@azure/service-bus";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import path from "path";

dotenv.config();

const app: Express = express();
app.use(express.json());
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "../client/build")));

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

const serviceBusConnectionString = process.env.SERVICEBUS_CONNECTION_STRING;
const queueName = process.env.QUEUE_NAME;
if (!serviceBusConnectionString || !queueName) {
  throw new Error("Service bus credentials missing");
}

// TODO implement GUI here
app.get("/", async (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname + "/../client/build/index.html"));
});

app.get("/api/slots", async (req: Request, res: Response) => {
  const container = await prepareContainer();
  const items = await container.items.readAll().fetchAll();
  res.json(items.resources);
});

app.post("/api/slots", async (req: Request, res: Response) => {
  const container = await prepareContainer();
  const item = {
    owner: req.body.owner,
    resourceUri: req.body.resourceUri,
    blocked: false,
  };
  const created = await container.items.create(item);

  res.status(201).json(created.resource);
});

app.put("/api/slots/:id", async (req: Request, res: Response) => {
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

app.put("/test", async (req: Request, res: Response) => {
  const sbClient = new ServiceBusClient(serviceBusConnectionString);

  const sender = sbClient.createSender(queueName);

  const message: ServiceBusMessage = {
    contentType: "application/json",
    subject: "Scientist",
    body: req.body,
    timeToLive: 2 * 60 * 1000, // message expires in 2 minutes
  };
  await sender.sendMessages(message);

  // Close the sender
  await sender.close();
  res.json({ message: "done" });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
