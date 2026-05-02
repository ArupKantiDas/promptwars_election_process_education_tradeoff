"use client";

import { useEffect, useState } from "react";

const ROTATION_MS = 8_000;
const FADE_MS = 350;

const FACTS: readonly string[] = [
  "India has over 960 million registered voters — the largest electorate in the world.",
  "West Bengal has 294 Vidhan Sabha constituencies.",
  "The Model Code of Conduct comes into force the moment elections are announced.",
  "NOTA (None of the Above) has been available on EVMs since the 2013 state elections.",
  "Every polling booth must be within 2 km of every voter it serves.",
  "The Election Commission of India is one of the few institutions established by the Constitution itself, under Article 324."
];

export function ElectionFacts() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const rotation = setInterval(() => {
      // Fade out, swap, fade in.
      setVisible(false);
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % FACTS.length);
        setVisible(true);
      }, FADE_MS);
      // Cleanup the inner timer if the next interval fires first (shouldn't,
      // since FADE_MS << ROTATION_MS, but defensive).
      return () => clearTimeout(swap);
    }, ROTATION_MS);
    return () => clearInterval(rotation);
  }, []);

  return (
    <section
      aria-labelledby="election-facts-heading"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-slate-100 shadow-card"
    >
      <div className="flex items-baseline gap-3">
        <span
          aria-hidden="true"
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200 ring-1 ring-white/15"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
          Did you know
        </span>
        <h2 id="election-facts-heading" className="sr-only">
          Did you know — facts about Indian elections
        </h2>
      </div>
      <p
        className="mt-4 min-h-[3.5em] text-[15px] leading-relaxed text-slate-100 transition-opacity duration-300 ease-in-out sm:text-base"
        style={{ opacity: visible ? 1 : 0 }}
        role="status"
        aria-live="polite"
      >
        {FACTS[index]}
      </p>
      <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
        {FACTS.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === index ? "w-6 bg-amber-300" : "w-1 bg-white/20"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
