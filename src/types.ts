import { Response } from "express";

export interface SlotData {
  id: string;
  blocked: boolean;
}

export type LockResult = "success" | "failure";

export type LockResultData = {
  slotData: SlotData;
  result: LockResult;
};

export interface Client {
  id: number;
  res: Response;
}
