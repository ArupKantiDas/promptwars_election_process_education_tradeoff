import { Router } from "express";

// Contract (AGENTS.md → Endpoint contracts):
//   Request:  { pincode: string }
//   Response: { booths: [{ name: string, address: string, lat: number,
//                          lng: number, directions_url: string }] }

export type Booth = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  directions_url: string;
};

export type BoothResponse = {
  booths: Booth[];
};

export const boothRouter = Router();

boothRouter.post("/", (_req, res) => {
  // TODO: implement in Phase 8
  const response: BoothResponse = { booths: [] };
  res.status(200).json(response);
});
