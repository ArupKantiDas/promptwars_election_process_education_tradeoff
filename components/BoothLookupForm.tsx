"use client";

import { useId, useState } from "react";

type Props = {
  // Phase 3 stub: form does not yet call /api/booth. Submit just stores the
  // last-submitted pincode to demonstrate the UI flow.
  onSubmit?: (pincode: string) => void;
};

export function BoothLookupForm({ onSubmit }: Props) {
  const [pincode, setPincode] = useState("");
  const [submittedPincode, setSubmittedPincode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!/^\d{6}$/u.test(pincode)) {
      setError("Pincode must be exactly 6 digits.");
      setSubmittedPincode(null);
      return;
    }
    setError(null);
    setSubmittedPincode(pincode);
    onSubmit?.(pincode);
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Booth lookup by pincode"
      className="rounded-md border border-slate-200 bg-slate-50 p-4"
    >
      <label htmlFor={inputId} className="block text-xs font-medium uppercase tracking-wide text-slate-600">
        Pincode
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="postal-code"
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          aria-invalid={error !== null}
          aria-describedby={error !== null ? errorId : undefined}
          placeholder="700020"
          className="flex-grow rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          Find booth
        </button>
      </div>
      {error !== null && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {submittedPincode !== null && error === null && (
        <p
          role="status"
          className="mt-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800"
        >
          Looking up booth for pincode <span className="font-mono">{submittedPincode}</span>… [Phase 8 will call <code>/api/booth</code> and render the nearest polling booth from the response.]
        </p>
      )}
    </form>
  );
}
