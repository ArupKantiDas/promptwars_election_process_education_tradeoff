export default function JourneyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Voter journey</h1>
      <p className="mt-4 text-slate-600">
        Eligibility, registration, timing, polling location, and booth
        procedure. Booth lookup is served by the backend at{" "}
        <code className="rounded bg-slate-100 px-1">/api/booth</code>.
      </p>
    </main>
  );
}
