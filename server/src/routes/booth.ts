import { Router } from "express";
import { z } from "zod";
import { logger } from "../logger.js";

// Pincode-to-booth lookup for the voter journey page. Maps Platform key stays
// server-side; the frontend never calls Maps directly.
const BoothRequest = z.object({
  pincode: z.string().regex(/^\d{6}$/u)
});

export type BoothResult = {
  pincode: string;
  boothName: string | null;
  boothAddress: string | null;
  lat: number | null;
  lng: number | null;
};

export const boothRouter = Router();

boothRouter.post("/", async (req, res) => {
  const parsed = BoothRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }

  try {
    // TODO: call Maps Platform Geocoding for the pincode centroid, then
    // resolve the nearest ECI booth from the seeded booth dataset.
    const response: BoothResult = {
      pincode: parsed.data.pincode,
      boothName: null,
      boothAddress: null,
      lat: null,
      lng: null
    };
    res.status(200).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    logger.error("booth_failed", { message });
    res.status(502).json({ error: "booth_failed" });
  }
});
