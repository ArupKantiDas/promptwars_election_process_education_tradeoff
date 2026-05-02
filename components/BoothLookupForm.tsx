"use client";

import { useId, useRef, useState } from "react";
import { apiBooth, type Booth } from "@/lib/api";

type State =
  | { status: "idle" }
  | { status: "loading"; pincode: string }
  | { status: "ready"; pincode: string; booths: Booth[] }
  | { status: "error"; pincode: string; message: string };

export function BoothLookupForm() {
  const [pincode, setPincode] = useState("");
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [state, setState] = useState<State>({ status: "idle" });
  const inputId = useId();
  const errorId = useId();
  const abortRef = useRef<AbortController | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!/^\d{6}$/u.test(pincode)) {
      setPincodeError("Pincode must be exactly 6 digits.");
      return;
    }
    setPincodeError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading", pincode });

    apiBooth(pincode, controller.signal)
      .then((booths) => {
        if (controller.signal.aborted) return;
        setState({ status: "ready", pincode, booths });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "unknown_error";
        setState({ status: "error", pincode, message });
      });
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
          aria-invalid={pincodeError !== null}
          aria-describedby={pincodeError !== null ? errorId : undefined}
          placeholder="700020"
          className="flex-grow rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        />
        <button
          type="submit"
          disabled={state.status === "loading"}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {state.status === "loading" ? "Looking up…" : "Find booth"}
        </button>
      </div>
      {pincodeError !== null && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-red-700">
          {pincodeError}
        </p>
      )}
      {state.status === "loading" && (
        <p
          role="status"
          className="mt-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800"
        >
          Looking up booths near pincode <span className="font-mono">{state.pincode}</span>…
        </p>
      )}
      {state.status === "error" && (
        <p
          role="alert"
          className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          Could not look up booths for pincode <span className="font-mono">{state.pincode}</span>: {state.message}
        </p>
      )}
      {state.status === "ready" && (
        <BoothResults pincode={state.pincode} booths={state.booths} />
      )}
      <p className="mt-3 text-[11px] text-slate-500">
        Cross-check on the official ECI portal:{" "}
        <a
          href="https://electoralsearch.eci.gov.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          electoralsearch.eci.gov.in
        </a>{" "}
        (opens in a new tab) — enter your EPIC number to see your assigned polling booth.
      </p>
    </form>
  );
}

function BoothResults({ pincode, booths }: { pincode: string; booths: readonly Booth[] }) {
  if (booths.length === 0) {
    return (
      <p
        role="status"
        className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
      >
        No polling booths returned for pincode <span className="font-mono">{pincode}</span>. Try the ECI portal link below to look up your assigned booth by EPIC number.
      </p>
    );
  }
  return (
    <div className="mt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
        Booths near pincode <span className="font-mono">{pincode}</span>
      </p>
      <ul role="list" className="mt-2 space-y-2">
        {booths.map((b, idx) => (
          <li
            key={`${b.lat}-${b.lng}-${idx}`}
            className="rounded-md border border-slate-200 bg-white p-3"
          >
            <h4 className="text-sm font-semibold text-slate-900">{b.name}</h4>
            <p className="mt-0.5 text-xs text-slate-600">{b.address}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              <span className="font-mono">{b.lat.toFixed(4)}, {b.lng.toFixed(4)}</span>
              {" · "}
              <a
                href={b.directions_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                aria-label={`Get directions to ${b.name} (opens in a new tab)`}
              >
                Get directions →
              </a>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
