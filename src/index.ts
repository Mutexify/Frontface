import { CosmosClient } from "@azure/cosmos";
import { ServiceBusClient, ServiceBusMessage } from "@azure/service-bus";
import cors from "cors";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";

dotenv.config();
const app: Express = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
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

async function prepareMessageBusSender() {
  const serviceBusConnectionString = process.env.SERVICEBUS_CONNECTION_STRING;
  const queueName = process.env.QUEUE_NAME;
  if (!serviceBusConnectionString || !queueName) {
    throw new Error("Service bus credentials missing");
  }
  const sbClient = new ServiceBusClient(serviceBusConnectionString);
  return sbClient.createSender(queueName);
}

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

// app.put("/api/slots/:id", async (req: Request, res: Response) => {
//   const container = await prepareContainer();
//   const item = {
//     id: req.params.id,
//     owner: req.body.owner,
//     resourceUri: req.body.resourceUri,
//     blocked: req.body.blocked,
//   };
//   const updated = await container.item(req.params.id).replace(item);

//   res.json(updated.resource);
// });

app.patch("/api/slots/:id", async (req: Request, res: Response) => {
  const item = {
    blocked: req.body.blocked,
  };

  console.log("patching", req.params.id, item);

  const sender = await prepareMessageBusSender();

  const message: ServiceBusMessage = {
    contentType: "application/json",
    subject: "Scientist",
    body: item,
    timeToLive: 2 * 60 * 1000, // message expires in 2 minutes
  };
  await sender.sendMessages(message);

  // Close the sender
  await sender.close();
  res.json({ message: "done" });
});

let clients: any[] = [];

app.get("/api/sse/clients", async (req: Request, res: Response) => {
  res.json(clients);
});

function eventsHandler(req: Request, res: Response, next: any) {
  const headers = {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };
  res.writeHead(200, headers);

  res.write("Connected\n\n");

  const clientId = Date.now();

  const newClient = {
    id: clientId,
    res,
  };

  clients.push(newClient);

  req.on("close", () => {
    console.log(`${clientId} Connection closed`);
    clients = clients.filter((client) => client.id !== clientId);
  });
}

app.get("/api/sse/events", eventsHandler);

app.post("/api/sse/events", async (req: Request, res: Response) => {
  const message: any = req.body;
  res.json(message);
  clients.forEach((client) => {
    client.res.write(`data: ${JSON.stringify(message)}\n\n`);
  });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
