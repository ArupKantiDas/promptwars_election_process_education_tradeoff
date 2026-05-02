import express, { type NextFunction, type Request, type Response } from "express";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { boothRouter } from "./routes/booth.js";
import { classifyRouter } from "./routes/classify.js";
import { extractRouter } from "./routes/extract.js";
import { missingRouter } from "./routes/missing.js";
import { scoreRouter } from "./routes/score.js";
import { warmRouter } from "./routes/warm.js";

const config = loadConfig();
const app = express();

app.disable("x-powered-by");

// CORS — allow the frontend dev server (and the production frontend, when
// CORS_ALLOWED_ORIGINS is set) to call the backend directly. The frontend
// no longer goes through the Next.js dev rewrite proxy for /api/*, because
// the rewrite proxy times out at ~30s and live Gemini calls can exceed
// that window. Production frontend (Vercel/etc.) is cross-origin from the
// Cloud Run backend regardless, so CORS is required there too.
const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3050"
];
const PROD_ORIGINS = (process.env["CORS_ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);
const ALLOWED_ORIGINS = new Set([...DEV_ORIGINS, ...PROD_ORIGINS]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (typeof origin === "string" && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "600");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json({ limit: "2mb" }));

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/extract", extractRouter);
app.use("/api/classify", classifyRouter);
app.use("/api/score", scoreRouter);
app.use("/api/missing", missingRouter);
app.use("/api/booth", boothRouter);
app.use("/api/warm", warmRouter);

app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "unknown_error";
  logger.error("unhandled_error", { message });
  res.status(500).json({ error: "internal_error" });
});

app.listen(config.port, () => {
  logger.info("server_started", { port: config.port, env: config.nodeEnv });
});
