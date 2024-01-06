import { ItemDefinition } from "@azure/cosmos";
import { SlotData } from "./types";

export function slotDataFromDBResponse(response: ItemDefinition): SlotData {
  if (!response.id) {
    throw new Error("DB response missing slot id");
  }

  if (response.blocked === undefined || response.blocked === null) {
    throw new Error("DB response missing blocked flag");
  }

  return {
    id: response.id,
    blocked: response.blocked,
  };
}
