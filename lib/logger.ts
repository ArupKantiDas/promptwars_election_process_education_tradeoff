type Level = "debug" | "info" | "warn" | "error";

type Fields = Record<string, unknown>;

function emit(level: Level, message: string, fields?: Fields): void {
  const payload = { level, message, ...(fields ?? {}) };
  const line = JSON.stringify(payload);
  if (level === "error" || level === "warn") {
    // eslint-disable-next-line no-console
    console[level](line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, fields?: Fields): void => emit("debug", message, fields),
  info: (message: string, fields?: Fields): void => emit("info", message, fields),
  warn: (message: string, fields?: Fields): void => emit("warn", message, fields),
  error: (message: string, fields?: Fields): void => emit("error", message, fields)
};
