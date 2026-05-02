"use client";

import { useId, useState } from "react";

// Phase 8 — election-phase timeline.
//
// Generic phase structure only — no election dates are hardcoded. Real dates
// are published in the Election Commission's notification for each election;
// this component shows the procedural arc every Indian election follows.
//
// The "Silence period" phase has an explainer for Section 126 of the
// Representation of the People Act, 1951 — the 48-hour pre-poll prohibition
// on campaigning, opinion polls, and electoral matter in print/broadcast
// media. The explainer is tooltip-on-hover for sighted users and a
// keyboard-focusable details disclosure for keyboard users.

type Phase = {
  id: string;
  label: string;
  shortLabel: string;
  detail: string;
};

const PHASES: readonly Phase[] = [
  {
    id: "notification",
    label: "Notification",
    shortLabel: "Notification",
    detail:
      "The President or Governor issues notification calling the election. From this date the electoral process formally begins."
  },
  {
    id: "scrutiny",
    label: "Scrutiny of nominations",
    shortLabel: "Scrutiny",
    detail:
      "Returning Officer examines each nomination paper for legal compliance — citizenship, age, deposit, electoral-roll entry, signatures. Defective papers may be rejected."
  },
  {
    id: "withdrawal",
    label: "Withdrawal of candidatures",
    shortLabel: "Withdrawal",
    detail:
      "Candidates may withdraw within the prescribed window (typically 2 days after scrutiny). After this, the final list of contesting candidates is published."
  },
  {
    id: "campaign",
    label: "Campaign period",
    shortLabel: "Campaign",
    detail:
      "Public meetings, canvassing, advertisements, door-to-door outreach. Model Code of Conduct is in force from the date of notification through results."
  },
  {
    id: "silence",
    label: "Silence period (Section 126)",
    shortLabel: "Silence",
    detail:
      "Section 126, Representation of the People Act 1951: the 48 hours immediately before polling close. No public meetings, processions, or display of election matter through cinematograph, television, or other electronic media. Violation is punishable with imprisonment up to 2 years, fine, or both."
  },
  {
    id: "polling",
    label: "Polling day",
    shortLabel: "Polling",
    detail:
      "Voters cast ballots at their assigned polling station from 7 a.m. to 6 p.m. (timings may vary by constituency and weather). EVM, VVPAT, indelible ink, and Form 17A acknowledgement."
  },
  {
    id: "counting",
    label: "Counting and declaration",
    shortLabel: "Counting",
    detail:
      "EVM votes counted at the constituency counting centre under returning officer supervision. VVPAT slips from a sample of polling stations are tallied to verify EVM totals. Returning Officer declares the result."
  }
];

export function ElectionTimeline() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const headingId = useId();
  const tooltipId = useId();

  // SVG layout constants. The timeline is a 700-unit-wide horizontal axis
  // with 7 evenly-spaced phase markers; the viewport scales to container
  // width via preserveAspectRatio.
  const VB_W = 700;
  const VB_H = 120;
  const PADDING_X = 40;
  const AXIS_Y = 60;
  const usableW = VB_W - PADDING_X * 2;
  const stepX = usableW / (PHASES.length - 1);

  const active = PHASES.find((p) => p.id === activeId) ?? null;

  return (
    <figure aria-labelledby={headingId} className="rounded-md border border-slate-200 bg-white p-4">
      <figcaption id={headingId} className="text-xs font-medium uppercase tracking-wide text-slate-600">
        Procedural arc of an Indian election (generic — no dates hardcoded)
      </figcaption>
      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Election timeline with seven phases: notification, scrutiny, withdrawal, campaign, silence period, polling day, counting. Hover or focus a phase for details."
          className="block w-full max-w-full"
        >
          {/* axis line */}
          <line
            x1={PADDING_X}
            y1={AXIS_Y}
            x2={VB_W - PADDING_X}
            y2={AXIS_Y}
            stroke="rgb(148 163 184)"
            strokeWidth="2"
          />
          {PHASES.map((phase, idx) => {
            const cx = PADDING_X + idx * stepX;
            const isActive = phase.id === activeId;
            const isSilence = phase.id === "silence";
            return (
              <g
                key={phase.id}
                className="cursor-pointer focus:outline-none"
                tabIndex={0}
                role="button"
                aria-describedby={isActive ? tooltipId : undefined}
                aria-label={`${phase.label}. ${phase.detail}`}
                onMouseEnter={() => setActiveId(phase.id)}
                onMouseLeave={() => setActiveId((prev) => (prev === phase.id ? null : prev))}
                onFocus={() => setActiveId(phase.id)}
                onBlur={() => setActiveId((prev) => (prev === phase.id ? null : prev))}
              >
                {/* circle marker — silence phase is amber-ringed */}
                <circle
                  cx={cx}
                  cy={AXIS_Y}
                  r={isActive ? 9 : 7}
                  fill={isActive ? (isSilence ? "rgb(245 158 11)" : "rgb(37 99 235)") : "rgb(255 255 255)"}
                  stroke={isSilence ? "rgb(217 119 6)" : "rgb(37 99 235)"}
                  strokeWidth={isSilence ? 3 : 2}
                />
                {/* label below */}
                <text
                  x={cx}
                  y={AXIS_Y + 28}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isActive ? "rgb(15 23 42)" : "rgb(71 85 105)"}
                  fontWeight={isActive ? 600 : 400}
                >
                  {phase.shortLabel}
                </text>
                {/* phase number above */}
                <text
                  x={cx}
                  y={AXIS_Y - 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="rgb(148 163 184)"
                  fontFamily="ui-monospace, monospace"
                >
                  {idx + 1}
                </text>
                {/* expanded hit area for easier hover/focus */}
                <rect
                  x={cx - stepX / 2}
                  y={AXIS_Y - 30}
                  width={stepX}
                  height={60}
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>
      </div>
      {active !== null && (
        <div
          id={tooltipId}
          role="status"
          aria-live="polite"
          className="mt-3 rounded border-l-4 border-blue-400 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-slate-800"
        >
          <p className="font-semibold text-slate-900">{active.label}</p>
          <p className="mt-1">{active.detail}</p>
        </div>
      )}
      {active === null && (
        <p className="mt-3 text-xs text-slate-500">
          Hover or tab to a phase marker to see the rule that applies in that window.
        </p>
      )}
    </figure>
  );
}
