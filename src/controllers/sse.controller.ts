import { Request, Response } from "express";
import { Client } from "../types";

let sseClients: Client[] = [];

export async function getSseClientsHandler(req: Request, res: Response) {
  console.log("sseClients", sseClients);
  res.json(sseClients.length);
}

export async function subscribeToEventsHandler(req: Request, res: Response) {
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

  sseClients.push(newClient);

  req.on("close", () => {
    console.log(`${clientId} Connection closed`);
    sseClients = sseClients.filter((client) => client.id !== clientId);
  });
}

export { sseClients };
