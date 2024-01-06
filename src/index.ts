import { CosmosClient } from "@azure/cosmos";
import {
  ProcessErrorArgs,
  ServiceBusClient,
  ServiceBusMessage,
} from "@azure/service-bus";
import cors from "cors";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import { slotDataFromDBResponse } from "./helpers";
import { Client, SlotData } from "./types";

dotenv.config();
const app: Express = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT;

//////////////////////////// slots management /////////////////////////////

// TODO move to helpers.ts
async function prepareContainer() {
  const cosmos_endpoint = process.env.COSMOS_ENDPOINT;
  const cosmos_key = process.env.COSMOS_KEY;
  if (!cosmos_endpoint || !cosmos_key) {
    throw new Error("Cosmos DB credentials missing");
  }
  const client = new CosmosClient({
    endpoint: cosmos_endpoint,
    key: cosmos_key,
  });
  const { database } = await client.databases.createIfNotExists({
    id: "mutexio", // TODO change to env variable
  });
  const { container } = await database.containers.createIfNotExists({
    id: "slots", // TODO change to env variable
  });
  return container;
}

app.get("/api/slots", async (req: Request, res: Response) => {
  const container = await prepareContainer();
  const items = await container.items.readAll().fetchAll();
  const slots = items.resources.map((item) => slotDataFromDBResponse(item));
  res.json(slots);
});

app.post("/api/slots", async (req: Request, res: Response) => {
  const container = await prepareContainer();
  const item = {
    // owner: req.body.owner,
    // resourceUri: req.body.resourceUri,
    blocked: false,
  };
  const created = await container.items.create(item);

  res.status(201).json(created.resource);
});

///////////////////////////// lock management //////////////////////////////

async function prepareMessageBusSender() {
  const serviceBusConnectionString = process.env.SERVICEBUS_CONNECTION_STRING;
  const queueName = process.env.SERVICEBUS_LOCK_REQUEST_QUEUE_NAME;
  if (!serviceBusConnectionString || !queueName) {
    throw new Error("Service bus credentials missing");
  }
  const sbClient = new ServiceBusClient(serviceBusConnectionString);
  return sbClient.createSender(queueName);
}

app.patch("/api/slots/:id", async (req: Request, res: Response) => {
  const slotData: SlotData = {
    id: req.params.id,
    blocked: req.body.blocked,
  };

  console.log(`PATCH /slot/${slotData.id}`, slotData);

  const sender = await prepareMessageBusSender();

  const message: ServiceBusMessage = {
    contentType: "application/json",
    body: slotData,
  };
  await sender.sendMessages(message);

  await sender.close();
  res.json(["Successfully processed patch request"]);
});

/////////////////////////////// SSE ///////////////////////////////////////

let clients: Client[] = [];

app.get("/api/sse/clients", async (req: Request, res: Response) => {
  console.log("clients", clients);
  res.json(clients.length);
});

function eventsHandler(req: Request, res: Response, next: any) {
  const headers = {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };
  res.writeHead(200, headers);

  const clientId = Date.now();

  const newClient: Client = {
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

//////////////////////////// handling lock results /////////////////////////////

function prepareMessageBusReceiver() {
  const serviceBusConnectionString = process.env.SERVICEBUS_CONNECTION_STRING;
  const topicName = process.env.SERVICEBUS_LOCK_RESULT_TOPIC_NAME;
  const subscriptionName = process.env.SERVICEBUS_LOCK_RESULT_SUBSCRIPTION_NAME;
  if (!serviceBusConnectionString || !topicName || !subscriptionName) {
    throw new Error("Service bus credentials missing");
  }
  const sbClient = new ServiceBusClient(serviceBusConnectionString);
  return sbClient.createReceiver(topicName, subscriptionName);
}

async function lockResultMessageHandler(message: ServiceBusMessage) {
  const lockResultData = JSON.stringify(message.body);
  console.log("Received result message: ", lockResultData);
  clients.forEach((client) => {
    client.res.write(`data: ${lockResultData}\n\n`);
  });
}

const lockResultErrorHandler = async (args: ProcessErrorArgs) => {
  console.log(args);
};

const receiver = prepareMessageBusReceiver();
receiver.subscribe({
  processMessage: lockResultMessageHandler,
  processError: lockResultErrorHandler,
});

///////////////////////////////////////////////////////////////////////////

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
