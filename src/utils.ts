import { Container, CosmosClient } from "@azure/cosmos";
import {
  ServiceBusClient,
  ServiceBusReceiver,
  ServiceBusSender,
} from "@azure/service-bus";
import { SlotData, User } from "./types";

export function slotDataFromDBResponse(response: SlotData): SlotData {
  return {
    owners: response.owners,
    id: response.id,
    blocked: response.blocked,
  };
}

export function userFromDBResponse(response: User): User {
  return {
    id: response.id,
    name: response.name,
    email: response.email,
    photo: response.photo,
  };
}

const container: Record<string, Container> = {};
export async function prepareCosmosContainer(
  containerName: string
): Promise<Container> {
  if (containerName in container) return container[containerName];
  console.log("Preparing cosmos container for name: ", containerName);

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
    id: process.env.COSMOS_DB_NAME,
  });
  const dbContainer = await database.containers.createIfNotExists({
    id: containerName,
  });

  container[containerName] = dbContainer.container;
  return container[containerName];
}

const sbSender: ServiceBusSender | undefined = undefined;
const sbReceiver: ServiceBusReceiver | undefined = undefined;
export function prepareServiceBusClients() {
  if (sbSender && sbReceiver) return { sbSender, sbReceiver };

  const serviceBusConnectionString = process.env.SERVICEBUS_CONNECTION_STRING;
  const queueName = process.env.SERVICEBUS_LOCK_REQUEST_QUEUE_NAME;
  const topicName = process.env.SERVICEBUS_LOCK_RESULT_TOPIC_NAME;
  const subscriptionName = process.env.SERVICEBUS_LOCK_RESULT_SUBSCRIPTION_NAME;
  if (
    !serviceBusConnectionString ||
    !queueName ||
    !topicName ||
    !subscriptionName
  ) {
    throw new Error("Service bus configuration variables missing");
  }
  const sbClient = new ServiceBusClient(serviceBusConnectionString);
  return {
    sbSender: sbClient.createSender(queueName),
    sbReceiver: sbClient.createReceiver(topicName, subscriptionName),
  };
}
