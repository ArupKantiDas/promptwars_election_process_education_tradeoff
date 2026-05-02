import type { ReactNode } from "react";

type Props = {
  step: number;
  title: string;
  summary: string;
  deepLink?:
    | {
        href: string;
        label: string;
      }
    | undefined;
  children?: ReactNode;
};

const ExternalArrow = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    className="h-3 w-3"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 11l6-6M11 5H6m5 0v5" />
  </svg>
);

export function JourneySection({ step, title, summary, deepLink, children }: Props) {
  const headingId = `journey-step-${step}`;
  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
    >
      <div className="flex">
        <div
          aria-hidden="true"
          className="flex w-14 shrink-0 flex-col items-center bg-slate-900 py-6 text-white sm:w-16"
        >
          <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-400">
            Step
          </span>
          <span className="mt-1 font-mono text-2xl font-bold tabular-nums">
            {step.toString().padStart(2, "0")}
          </span>
        </div>
        <div className="min-w-0 flex-1 p-6 sm:p-7">
          <h2
            id={headingId}
            className="text-xl font-semibold tracking-tight text-slate-900 sm:text-[1.35rem]"
          >
            {title}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-700">{summary}</p>
          {children !== undefined && <div className="mt-5">{children}</div>}
          {deepLink !== undefined && (
            <p className="mt-5 border-t border-slate-100 pt-4">
              <a
                href={deepLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={`${deepLink.label} (opens in a new tab)`}
              >
                {deepLink.label}
                <ExternalArrow />
              </a>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
