import { Router } from "express";
import { z } from "zod";
import { logger } from "../logger.js";

// Pincode-to-booth lookup for the voter journey page. Maps Platform key
// stays server-side; the frontend never calls Maps directly.
//
// Live-mode pipeline (when MAPS_API_KEY is set):
//   1. Geocode the pincode → centroid (lat, lng) via Maps Geocoding API.
//   2. Places Nearby Search around that centroid with a keyword fallback
//      ladder: try "polling booth" first; if nothing returns, fall back to
//      "government school", then "primary school". Polling booths in India
//      are overwhelmingly hosted in government and primary schools, so
//      these widen the net when the explicit "polling booth" tag is absent
//      from Places (often the case outside an active election cycle).
//      Search radius is 5 km. The keyword that produced results is logged.
//   3. Map to the contract shape: { name, address, lat, lng, directions_url }.
//      directions_url uses the public Google Maps URLs API format so any
//      browser can open turn-by-turn directions without an SDK.
//
// Note on ECI booth locator: there is no documented public API for the ECI
// booth locator (electoralsearch.eci.gov.in is a citizen-facing form). For
// production accuracy, voters should still cross-check on the ECI portal;
// the journey page surfaces that as a deep link.
//
// Stub mode (no MAPS_API_KEY): returns a single deterministic Bhabanipur
// demo booth so the frontend booth-lookup flow is testable without GCP.
//
// Contract (AGENTS.md → Endpoint contracts):
//   Request:  { pincode: string }
//   Response: { booths: [{ name, address, lat, lng, directions_url }] }

const BoothRequest = z.object({
  pincode: z.string().regex(/^\d{6}$/u)
});

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

const NEARBY_RADIUS_METERS = 5000;
const MAX_BOOTHS = 5;
// Ordered fallback ladder for the Nearby Search keyword. Try the most
// specific term first; widen progressively. The first keyword that returns
// at least one candidate place wins; subsequent keywords are not tried.
const NEARBY_KEYWORD_LADDER: readonly string[] = [
  "polling booth",
  "government school",
  "primary school"
];

function directionsUrl(lat: number, lng: number, placeId?: string): string {
  const base = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return placeId !== undefined ? `${base}&destination_place_id=${placeId}` : base;
}

// Stub fallback. Returns a deterministic Bhabanipur-area polling booth so
// the UI flow renders without hitting Maps APIs. Coordinates approximate
// Padmapukur (Bhabanipur AC ward 71).
function stubBooths(pincode: string): Booth[] {
  return [
    {
      name: "Bhabanipur Polling Station 12 (Padmapukur Primary School)",
      address: `Padmapukur Road, Bhabanipur, Kolkata ${pincode}`,
      lat: 22.5301,
      lng: 88.3504,
      directions_url: directionsUrl(22.5301, 88.3504)
    },
    {
      name: "Bhabanipur Polling Station 24 (Bakulbagan Community Hall)",
      address: `Bakulbagan Road, Bhabanipur, Kolkata ${pincode}`,
      lat: 22.5278,
      lng: 88.3498,
      directions_url: directionsUrl(22.5278, 88.3498)
    }
  ];
}

type GeocodeResult = {
  geometry?: { location?: { lat?: unknown; lng?: unknown } };
};

type PlaceResult = {
  name?: unknown;
  vicinity?: unknown;
  formatted_address?: unknown;
  place_id?: unknown;
  geometry?: { location?: { lat?: unknown; lng?: unknown } };
};

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

type MapsClient = {
  placesNearby: (args: {
    params: { location: { lat: number; lng: number }; radius: number; keyword: string; key: string };
    timeout: number;
  }) => Promise<{ data: { results?: PlaceResult[] } }>;
};

async function placesForKeyword(
  client: MapsClient,
  apiKey: string,
  lat: number,
  lng: number,
  keyword: string
): Promise<Booth[]> {
  const placesRes = await client.placesNearby({
    params: {
      location: { lat, lng },
      radius: NEARBY_RADIUS_METERS,
      keyword,
      key: apiKey
    },
    timeout: 5000
  });
  const out: Booth[] = [];
  const results: PlaceResult[] = Array.isArray(placesRes.data.results)
    ? placesRes.data.results
    : [];
  for (const p of results) {
    const pLat = p.geometry?.location?.lat;
    const pLng = p.geometry?.location?.lng;
    if (!isFiniteNum(pLat) || !isFiniteNum(pLng)) continue;
    const name = typeof p.name === "string" ? p.name : "Polling station";
    const address =
      typeof p.vicinity === "string"
        ? p.vicinity
        : typeof p.formatted_address === "string"
          ? p.formatted_address
          : "Address unavailable";
    const placeId = typeof p.place_id === "string" ? p.place_id : undefined;
    out.push({
      name,
      address,
      lat: pLat,
      lng: pLng,
      directions_url: directionsUrl(pLat, pLng, placeId)
    });
    if (out.length >= MAX_BOOTHS) break;
  }
  return out;
}

async function liveBoothLookup(pincode: string, apiKey: string): Promise<Booth[]> {
  // Lazy-import the Maps SDK so stub-mode startup does not load it.
  const { Client } = await import("@googlemaps/google-maps-services-js");
  const client = new Client({});

  // Step 1 — geocode the pincode to a centroid.
  const geocodeRes = await client.geocode({
    params: { address: `${pincode}, India`, key: apiKey },
    timeout: 5000
  });
  const top: GeocodeResult | undefined = geocodeRes.data.results?.[0];
  const lat = top?.geometry?.location?.lat;
  const lng = top?.geometry?.location?.lng;
  if (!isFiniteNum(lat) || !isFiniteNum(lng)) {
    throw new Error(`Geocoding returned no usable centroid for pincode ${pincode}`);
  }

  // Step 2 — try each keyword in the fallback ladder; first non-empty wins.
  for (const keyword of NEARBY_KEYWORD_LADDER) {
    const booths = await placesForKeyword(client as MapsClient, apiKey, lat, lng, keyword);
    if (booths.length > 0) {
      logger.info("booth_keyword_hit", { pincode, keyword, count: booths.length });
      return booths;
    }
    logger.info("booth_keyword_miss", { pincode, keyword });
  }
  // Every keyword in the ladder returned zero results.
  logger.warn("booth_keyword_ladder_exhausted", { pincode });
  return [];
}

export const boothRouter = Router();

boothRouter.post("/", async (req, res) => {
  const parsed = BoothRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const { pincode } = parsed.data;

  const apiKey = process.env["MAPS_API_KEY"];
  try {
    let booths: Booth[];
    if (typeof apiKey === "string" && apiKey.length > 0) {
      booths = await liveBoothLookup(pincode, apiKey);
      logger.info("booth_live", { pincode, count: booths.length });
    } else {
      booths = stubBooths(pincode);
      logger.info("booth_stub", { pincode, count: booths.length });
    }
    const response: BoothResponse = { booths };
    res.status(200).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    logger.error("booth_failed", { pincode, message });
    res.status(502).json({ error: "booth_failed", message });
  }
});
