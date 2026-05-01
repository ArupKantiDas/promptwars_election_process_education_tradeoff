import { LandingForm } from "@/components/LandingForm";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">TradeOff</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-700">
          A manifesto literacy tool for Indian voters. Bring your priorities. We bring the citations and the rubric. You decide.
        </p>
      </header>
      <div className="mt-8">
        <LandingForm />
      </div>
    </main>
  );
}
