import { ProcessErrorArgs, ServiceBusMessage } from "@azure/service-bus";
import cors from "cors";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import {
  prepareCosmosContainer,
  prepareServiceBusClients,
  slotDataFromDBResponse,
} from "./helpers";
import { Client, SlotData } from "./types";

dotenv.config();
const app: Express = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT;

//////////////////////////// slots management /////////////////////////////

app.get("/api/slots", async (req: Request, res: Response) => {
  const container = await prepareCosmosContainer();
  const items = await container.items.readAll().fetchAll();
  const slots = items.resources.map((item) => slotDataFromDBResponse(item));
  res.json(slots);
});

app.post("/api/slots", async (req: Request, res: Response) => {
  const container = await prepareCosmosContainer();
  const item = {
    // owner: req.body.owner,
    // resourceUri: req.body.resourceUri,
    blocked: false,
  };
  const created = await container.items.create(item);

  res.status(201).json(created.resource);
});

///////////////////////////// lock management //////////////////////////////

app.patch("/api/slots/:id", async (req: Request, res: Response) => {
  const slotData: SlotData = {
    id: req.params.id,
    blocked: req.body.blocked,
  };

  console.log(`PATCH /slot/${slotData.id}`, slotData);

  const { sbSender } = prepareServiceBusClients();

  const message: ServiceBusMessage = {
    contentType: "application/json",
    body: slotData,
  };
  await sbSender.sendMessages(message);

  await sbSender.close();
  res.json(["Successfully processed patch request"]);
});

/////////////////////////////// SSE ///////////////////////////////////////

let clients: Client[] = [];

app.get("/api/sse/clients", async (req: Request, res: Response) => {
  console.log("clients", clients);
  res.json(clients.length);
});

app.get("/api/sse/events", async (req: Request, res: Response) => {
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
});

//////////////////////////// handling lock results /////////////////////////////

const { sbReceiver } = prepareServiceBusClients();
sbReceiver.subscribe({
  processMessage: async (message: ServiceBusMessage) => {
    const lockResultData = JSON.stringify(message.body);
    console.log("Received result message: ", lockResultData);
    clients.forEach((client) => {
      client.res.write(`data: ${lockResultData}\n\n`);
    });
  },
  processError: async (args: ProcessErrorArgs) => {
    console.log(args);
  },
});

///////////////////////////////////////////////////////////////////////////

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
