type Level = "debug" | "info" | "warn" | "error";

type Fields = Record<string, unknown>;

function emit(level: Level, message: string, fields?: Fields): void {
  const payload = { level, message, ts: new Date().toISOString(), ...(fields ?? {}) };
  const line = JSON.stringify(payload);
  if (level === "error" || level === "warn") {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

export const logger = {
  debug: (message: string, fields?: Fields): void => emit("debug", message, fields),
  info: (message: string, fields?: Fields): void => emit("info", message, fields),
  warn: (message: string, fields?: Fields): void => emit("warn", message, fields),
  error: (message: string, fields?: Fields): void => emit("error", message, fields)
};
