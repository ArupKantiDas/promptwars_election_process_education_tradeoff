import { readFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "../logger.js";

// Phase 4 seed script. Indexes the four manifestos in Vertex AI Search.
//
// Two-stage flow:
//   1. Upload each manifesto + affidavit to a Google Cloud Storage bucket
//      under a deterministic key with metadata identifying the candidate.
//   2. Trigger a Discovery Engine `Documents:import` job that ingests the
//      uploaded files into the configured data store.
//
// Both @google-cloud/storage and @google-cloud/discoveryengine are loaded
// via dynamic import so the server's main runtime does not pay the SDK
// install or boot cost. Run via `npm run seed` from the repo root or from
// /server. The script no-ops with a clear message if the required env vars
// are missing.
//
// Required env vars:
//   GCP_PROJECT_ID                      — your GCP project ID
//   GCP_LOCATION                        — region (e.g. us-central1)
//   VERTEX_SEARCH_LOCATION              — usually "global"
//   VERTEX_DATA_STORE_ID                — the unstructured data store ID
//   SEED_GCS_BUCKET                     — bucket to stage manifestos in
//   GOOGLE_APPLICATION_CREDENTIALS      — service-account key path (for
//                                         local runs; on Cloud Run, ADC
//                                         is used automatically)
//
// Page+paragraph precision: this script uploads markdown as text/plain.
// Vertex AI Search returns paragraph offsets but no real page numbers for
// plain-text inputs — the {page, paragraph} fields in /api/extract are
// synthesised from paragraph order. For real page-numbered output, convert
// the markdown to PDF before upload (e.g., with pandoc) and adjust the
// content-type below to application/pdf.

type CandidateSeed = {
  candidateId: string;
  archetype: string;
  party: string;
  manifestoPath: string;
  affidavitPath: string;
};

const CANDIDATES: readonly CandidateSeed[] = [
  {
    candidateId: "anuradha-sen-sharma",
    archetype: "welfare-expansion",
    party: "Naagrik Adhikar Manch",
    manifestoPath: "content/candidates/welfare-expansion/manifesto.md",
    affidavitPath: "content/candidates/welfare-expansion/affidavit.json"
  },
  {
    candidateId: "rohit-mukherjee",
    archetype: "market-reform",
    party: "Pragati Sankalp Party",
    manifestoPath: "content/candidates/market-reform/manifesto.md",
    affidavitPath: "content/candidates/market-reform/affidavit.json"
  },
  {
    candidateId: "debarghya-pal",
    archetype: "regional-identity",
    party: "Bangabhumi Vikas Manch",
    manifestoPath: "content/candidates/regional-identity/manifesto.md",
    affidavitPath: "content/candidates/regional-identity/affidavit.json"
  },
  {
    candidateId: "ananya-bose",
    archetype: "reformist-outsider",
    party: "Aankalan Manch",
    manifestoPath: "content/candidates/reformist-outsider/manifesto.md",
    affidavitPath: "content/candidates/reformist-outsider/affidavit.json"
  }
] as const;

function repoRoot(): string {
  return path.resolve(process.cwd(), process.cwd().endsWith("/server") ? ".." : ".");
}

function require(name: string): string {
  const v = process.env[name];
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

async function uploadManifestos(bucketName: string): Promise<string[]> {
  const { Storage } = await import("@google-cloud/storage");
  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const gcsUris: string[] = [];
  for (const c of CANDIDATES) {
    const manifestoLocal = path.join(repoRoot(), c.manifestoPath);
    const buf = await readFile(manifestoLocal);
    const objectKey = `manifestos/${c.candidateId}.md`;
    await bucket.file(objectKey).save(buf, {
      contentType: "text/plain; charset=utf-8",
      metadata: {
        metadata: {
          candidateId: c.candidateId,
          archetype: c.archetype,
          party: c.party
        }
      }
    });
    const uri = `gs://${bucketName}/${objectKey}`;
    gcsUris.push(uri);
    logger.info("seed_uploaded_manifesto", { candidateId: c.candidateId, uri });
  }
  return gcsUris;
}

async function importToDataStore(
  projectId: string,
  searchLocation: string,
  dataStoreId: string,
  gcsUris: readonly string[]
): Promise<void> {
  // @google-cloud/discoveryengine is an optional dependency: it only needs
  // to be installed in the deployment environment that runs `npm run seed`.
  // Local-dev typecheck and the server runtime do not require it.
  // @ts-expect-error optional dep, present only at seed time
  const mod = await import("@google-cloud/discoveryengine");
  const { DocumentServiceClient } = mod.v1;
  const client = new DocumentServiceClient();
  const parent = `projects/${projectId}/locations/${searchLocation}/dataStores/${dataStoreId}/branches/default_branch`;
  const [operation] = await client.importDocuments({
    parent,
    gcsSource: {
      inputUris: gcsUris.slice(),
      dataSchema: "content"
    },
    reconciliationMode: "FULL"
  });
  logger.info("seed_import_started", { operationName: operation.name });
  const [response] = await operation.promise();
  logger.info("seed_import_complete", {
    successCount: response.successCount ?? 0,
    failureCount: response.failureCount ?? 0
  });
}

export async function seed(): Promise<void> {
  const projectId = process.env["GCP_PROJECT_ID"];
  const dataStoreId = process.env["VERTEX_DATA_STORE_ID"];
  const bucketName = process.env["SEED_GCS_BUCKET"];

  if (!projectId || !dataStoreId || !bucketName) {
    logger.warn("seed_skipped_missing_env", {
      missing: [
        projectId ? null : "GCP_PROJECT_ID",
        dataStoreId ? null : "VERTEX_DATA_STORE_ID",
        bucketName ? null : "SEED_GCS_BUCKET"
      ].filter((s) => s !== null)
    });
    process.stderr.write(
      "seed: required env vars missing. See server/src/scripts/seed.ts header for the list.\n"
    );
    process.exitCode = 1;
    return;
  }
  const searchLocation = process.env["VERTEX_SEARCH_LOCATION"] ?? "global";

  logger.info("seed_started", { projectId, dataStoreId, bucketName });
  const uris = await uploadManifestos(require("SEED_GCS_BUCKET"));
  await importToDataStore(projectId, searchLocation, dataStoreId, uris);
  logger.info("seed_done");
}

// Allow `npm run seed` invocation. Detect via import.meta.url comparison.
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seed().catch((err) => {
    const message = err instanceof Error ? err.message : "unknown_error";
    logger.error("seed_failed", { message });
    process.exitCode = 1;
  });
}
