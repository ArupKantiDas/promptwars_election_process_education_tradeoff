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

export function JourneySection({ step, title, summary, deepLink, children }: Props) {
  const headingId = `journey-step-${step}`;
  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-baseline gap-3">
        <span aria-hidden="true" className="font-mono text-xs text-slate-400">
          STEP {step.toString().padStart(2, "0")}
        </span>
        <h2 id={headingId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{summary}</p>
      {children !== undefined && <div className="mt-4">{children}</div>}
      {deepLink !== undefined && (
        <p className="mt-3 text-sm">
          <a
            href={deepLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 underline-offset-2 hover:underline focus:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label={`${deepLink.label} (opens in a new tab)`}
          >
            {deepLink.label} →
          </a>
        </p>
      )}
    </section>
  );
}
