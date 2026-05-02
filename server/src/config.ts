function readOptional(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// All external-service env vars are optional at boot. Each route resolves the
// vars it needs at request time and falls back to a local-dev path when they
// are absent (see manifestoSource and gemini for the fallback behaviour).
// This keeps the server bootable in CI and on a developer machine without a
// GCP project, while still validating real production configuration through
// the route-level checks.
export type Config = {
  port: number;
  nodeEnv: string;
  gcp: {
    projectId: string | undefined;
    location: string;
  };
  vertex: {
    searchEngineId: string | undefined;
    searchLocation: string;
    dataStoreId: string | undefined;
  };
  gemini: {
    model: string;
    apiKey: string | undefined;
  };
  maps: {
    apiKey: string | undefined;
  };
  firebase: {
    projectId: string | undefined;
    serviceAccountJson: string | undefined;
  };
};

export function loadConfig(): Config {
  return {
    port: Number.parseInt(process.env["PORT"] ?? "8080", 10),
    nodeEnv: process.env["NODE_ENV"] ?? "development",
    gcp: {
      projectId: readOptional("GCP_PROJECT_ID"),
      location: process.env["GCP_LOCATION"] ?? "us-central1"
    },
    vertex: {
      searchEngineId: readOptional("VERTEX_SEARCH_ENGINE_ID"),
      searchLocation: process.env["VERTEX_SEARCH_LOCATION"] ?? "global",
      dataStoreId: readOptional("VERTEX_DATA_STORE_ID")
    },
    gemini: {
      model: process.env["GEMINI_MODEL"] ?? "gemini-2.5-flash",
      apiKey: readOptional("GEMINI_API_KEY")
    },
    maps: {
      apiKey: readOptional("MAPS_API_KEY")
    },
    firebase: {
      projectId: readOptional("FIREBASE_PROJECT_ID"),
      serviceAccountJson: readOptional("FIREBASE_SERVICE_ACCOUNT_JSON")
    }
  };
}
