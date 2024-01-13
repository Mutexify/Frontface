import { Response } from "express";

export interface SlotData {
  id: string;
  blocked: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  photo: string;
}

export type LockResult = "success" | "failure" | "error" | "not_found";

export type LockResultData = {
  slotData: SlotData;
  result: LockResult;
};

export interface Client {
  id: number;
  res: Response;
}
