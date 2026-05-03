import { runSymmetryTest, type SymmetryReport, type Violation } from "./runner";

// CLI wrapper around runSymmetryTest. Prints a human-readable per-candidate
// metrics table, the corpus mean, and any band violations. Exit code 0 on
// pass, 1 on fail. Wired into CI via .github/workflows/symmetry.yml.

const BACKEND_URL = process.env["BACKEND_URL"] ?? "http://localhost:8080";

function fmt(n: number, dp = 2): string {
  return n.toFixed(dp);
}

function pad(s: string, n: number, side: "left" | "right" = "left"): string {
  if (s.length >= n) return s;
  return side === "left" ? s.padEnd(n) : s.padStart(n);
}

function describeViolation(v: Violation): string {
  switch (v.type) {
    case "totalCommitments":
      return `[${v.candidateName}] totalCommitments = ${v.actual}, expected ${v.expected}`;
    case "meanSpecificity":
      return `[${v.candidateName}] meanSpecificity = ${fmt(v.actual)}, corpus = ${fmt(v.corpusMean)}, delta = ${fmt(v.delta, 3)} (band ±${v.bandMax})`;
    case "meanMeasurability":
      return `[${v.candidateName}] meanMeasurability = ${fmt(v.actual)}, corpus = ${fmt(v.corpusMean)}, delta = ${fmt(v.delta, 3)} (band ±${v.bandMax})`;
    case "stdDev":
      return `[${v.candidateName}] stdDev = ${fmt(v.actual)}, corpus = ${fmt(v.corpusMean)}, delta = ${fmt(v.delta, 3)} (band ±${v.bandMax})`;
    case "issueCoverage":
      return `[corpus] issue "${v.issueId}" addressed by 0 candidates — at least 1 required`;
  }
}

function printReport(report: SymmetryReport): void {
  const log = (s = ""): void => {
    process.stdout.write(s + "\n");
  };

  log();
  log("╔════════════════════════════════════════════════════════════════════╗");
  log("║  SYMMETRY CI — TradeOff candidate corpus                           ║");
  log("╚════════════════════════════════════════════════════════════════════╝");
  log(`  backend:  ${report.backendUrl}`);
  log(`  ran at:   ${report.ranAt}`);
  log(`  duration: ${(report.durationMs / 1000).toFixed(2)}s`);
  log();
  log("  Per-candidate metrics:");
  log("  " + "─".repeat(70));
  log(
    "  " +
      pad("candidate", 24) +
      pad("commits", 9, "right") +
      pad("issues", 8, "right") +
      pad("meanSpec", 10, "right") +
      pad("meanMeas", 10, "right") +
      pad("stdDev", 8, "right")
  );
  log("  " + "─".repeat(70));
  for (const c of report.candidates) {
    log(
      "  " +
        pad(c.candidateName, 24) +
        pad(String(c.totalCommitments), 9, "right") +
        pad(String(c.issuesAddressed.length), 8, "right") +
        pad(fmt(c.meanSpecificity), 10, "right") +
        pad(fmt(c.meanMeasurability), 10, "right") +
        pad(fmt(c.stdDevAllDimensions), 8, "right")
    );
  }
  log("  " + "─".repeat(70));
  log(
    "  " +
      pad("CORPUS MEAN", 24) +
      pad("", 9) +
      pad("", 8) +
      pad(fmt(report.corpus.meanSpecificity), 10, "right") +
      pad(fmt(report.corpus.meanMeasurability), 10, "right") +
      pad(fmt(report.corpus.meanStdDev), 8, "right")
  );
  log();
  log("  Bands (AGENTS.md → \"Symmetry CI test\"):");
  log("    total commitments per candidate ............ 35–45");
  log("    mean specificity within ±0.4 of corpus mean");
  log("    mean measurability within ±0.4 of corpus mean");
  log("    stdDev of all-dimension scores within ±0.5 of corpus stdDev");
  log("    every canonical issue addressed by ≥1 candidate");
  log();

  if (report.pass) {
    log("╔════════════════════════════════════════════════════════════════════╗");
    log("║  RESULT: PASS — every band within tolerance                        ║");
    log("╚════════════════════════════════════════════════════════════════════╝");
    log();
  } else {
    log("╔════════════════════════════════════════════════════════════════════╗");
    log(
      "║  RESULT: FAIL — " +
        pad(`${report.violations.length} band violation(s)`, 51) +
        "║"
    );
    log("╚════════════════════════════════════════════════════════════════════╝");
    log();
    for (const v of report.violations) {
      log("  ✗ " + describeViolation(v));
    }
    log();
    log("  See CONTRIBUTING.md → \"Recalibration when symmetry fails\".");
    log("  Per AGENTS.md, candidate content is rewritten — never the test.");
    log();
  }
}

async function main(): Promise<void> {
  let report: SymmetryReport;
  try {
    report = await runSymmetryTest(BACKEND_URL);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    process.stderr.write(`\nsymmetry runner failed: ${message}\n`);
    process.stderr.write(
      `\nhint: is the backend running at ${BACKEND_URL}?\n` +
        `      start it with: npm --prefix server run dev\n` +
        `      or override with BACKEND_URL=http://other:8080 npm run symmetry\n\n`
    );
    process.exit(2);
  }
  printReport(report);
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : "unknown_error";
  process.stderr.write(`\nsymmetry cli crashed: ${message}\n`);
  process.exit(2);
});
