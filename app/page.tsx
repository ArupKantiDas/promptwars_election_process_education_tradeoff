import { LandingForm } from "@/components/LandingForm";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-700 ring-1 ring-slate-900/10">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Bhabanipur · West Bengal · Vidhan Sabha
        </p>
        <h1 className="mt-4 text-[2.6rem] font-bold leading-[1.05] tracking-tightest text-slate-900 sm:text-5xl">
          Manifesto literacy for the people who actually vote.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Bring your priorities. We bring the citations and the rubric. You decide whose commitments are real and whose are rhetoric.
        </p>
      </header>
      <div className="mt-10">
        <LandingForm />
      </div>
    </main>
  );
}
