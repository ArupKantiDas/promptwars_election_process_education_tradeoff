"use client";

import { useId, useMemo, useState } from "react";
import type { IndianState } from "@/lib/data/states";
import { DEFAULT_CONSTITUENCY_ID, DEFAULT_STATE_CODE, STATES } from "@/lib/data/states";

type Props = {
  initialStateCode?: string;
  initialConstituencyId?: string;
  onChange?: (state: string, constituency: string) => void;
};

export function StateConstituencySelector({
  initialStateCode = DEFAULT_STATE_CODE,
  initialConstituencyId = DEFAULT_CONSTITUENCY_ID,
  onChange
}: Props) {
  const [stateCode, setStateCode] = useState(initialStateCode);
  const [constituencyId, setConstituencyId] = useState(initialConstituencyId);
  const stateSelectId = useId();
  const constituencySelectId = useId();

  const selectedState: IndianState | undefined = useMemo(
    () => STATES.find((s) => s.code === stateCode),
    [stateCode]
  );

  function emit(nextState: string, nextConstituency: string) {
    onChange?.(nextState, nextConstituency);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={stateSelectId} className="block text-xs font-medium uppercase tracking-wide text-slate-600">
          State
        </label>
        <select
          id={stateSelectId}
          name="state"
          value={stateCode}
          onChange={(e) => {
            const next = e.target.value;
            setStateCode(next);
            const nextState = STATES.find((s) => s.code === next);
            const firstC = nextState?.constituencies[0]?.id ?? "";
            setConstituencyId(firstC);
            emit(next, firstC);
          }}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white py-2 px-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          aria-describedby={`${stateSelectId}-help`}
        >
          {STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </select>
        <p id={`${stateSelectId}-help`} className="mt-1 text-[11px] text-slate-500">
          v1 demo: only West Bengal is wired up.
        </p>
      </div>
      <div>
        <label htmlFor={constituencySelectId} className="block text-xs font-medium uppercase tracking-wide text-slate-600">
          Constituency
        </label>
        <select
          id={constituencySelectId}
          name="constituency"
          value={constituencyId}
          onChange={(e) => {
            const next = e.target.value;
            setConstituencyId(next);
            emit(stateCode, next);
          }}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white py-2 px-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          aria-describedby={`${constituencySelectId}-help`}
        >
          {(selectedState?.constituencies ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <p id={`${constituencySelectId}-help`} className="mt-1 text-[11px] text-slate-500">
          v1 demo: only Bhabanipur (AC #159) is calibrated.
        </p>
      </div>
    </div>
  );
}
