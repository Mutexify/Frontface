import { Response } from "express";

type Email = string;

export interface SlotData {
  id: string;
  blocked: boolean;
  owners: Email[];
}

export interface User {
  id: string;
  name: string;
  email: Email;
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
