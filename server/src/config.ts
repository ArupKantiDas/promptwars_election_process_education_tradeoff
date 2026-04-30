function readRequired(name: string): string {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function readOptional(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export type Config = {
  port: number;
  nodeEnv: string;
  gcp: {
    projectId: string;
    location: string;
  };
  vertex: {
    searchEngineId: string;
    searchLocation: string;
    dataStoreId: string;
  };
  gemini: {
    model: string;
    apiKey: string | undefined;
  };
  maps: {
    apiKey: string;
  };
  firebase: {
    projectId: string;
    serviceAccountJson: string | undefined;
  };
};

export function loadConfig(): Config {
  return {
    port: Number.parseInt(process.env.PORT ?? "8080", 10),
    nodeEnv: process.env.NODE_ENV ?? "development",
    gcp: {
      projectId: readRequired("GCP_PROJECT_ID"),
      location: readRequired("GCP_LOCATION")
    },
    vertex: {
      searchEngineId: readRequired("VERTEX_SEARCH_ENGINE_ID"),
      searchLocation: readRequired("VERTEX_SEARCH_LOCATION"),
      dataStoreId: readRequired("VERTEX_DATA_STORE_ID")
    },
    gemini: {
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      apiKey: readOptional("GEMINI_API_KEY")
    },
    maps: {
      apiKey: readRequired("MAPS_API_KEY")
    },
    firebase: {
      projectId: readRequired("FIREBASE_PROJECT_ID"),
      serviceAccountJson: readOptional("FIREBASE_SERVICE_ACCOUNT_JSON")
    }
  };
}
