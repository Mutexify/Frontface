import { ProcessErrorArgs, ServiceBusMessage } from "@azure/service-bus";
import { Request, Response, Router } from "express";
import { prepareServiceBusClients } from "../helpers";
import { Client, SlotData } from "../types";

export function subscribeToLockResults(clients: Client[]) {
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
}

const locksRouter = Router();

locksRouter.patch("/:id", async (req: Request, res: Response) => {
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

export { locksRouter };
