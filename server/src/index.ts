import express, { type NextFunction, type Request, type Response } from "express";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { boothRouter } from "./routes/booth.js";
import { classifyRouter } from "./routes/classify.js";
import { extractRouter } from "./routes/extract.js";
import { scoreRouter } from "./routes/score.js";
import { warmRouter } from "./routes/warm.js";

const config = loadConfig();
const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/extract", extractRouter);
app.use("/api/classify", classifyRouter);
app.use("/api/score", scoreRouter);
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
