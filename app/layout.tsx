import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "TradeOff — manifesto literacy for Indian voters",
  description:
    "Compare candidates on the issues you actually care about, scored against a five-dimension rubric with verbatim citations. Built for the Anti-Gravity hackathon."
};

const NAV_ITEMS = [
  { href: "/", label: "Pick priorities" },
  { href: "/matrix", label: "Matrix" },
  { href: "/missing", label: "What's missing" },
  { href: "/journey", label: "Voter journey" }
] as const;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Skip to main content
        </a>
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-slate-900"
              aria-label="TradeOff home"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-[11px] font-bold tracking-tight text-white shadow-sm group-hover:bg-blue-700"
              >
                T
              </span>
              <span className="text-base font-semibold tracking-tight">
                TradeOff
              </span>
              <span className="hidden text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:inline">
                manifesto literacy
              </span>
            </Link>
            <nav aria-label="Primary">
              <ul className="flex items-center gap-0.5 text-sm">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded-md px-3 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>
        <div id="main-content">{children}</div>
        <footer className="mt-16 border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-slate-500 sm:flex-row">
            <p>
              <span className="font-semibold text-slate-700">v1 demo</span>
              <span className="px-1.5 text-slate-300">·</span>
              West Bengal · Bhabanipur (AC #159)
            </p>
            <p className="text-slate-400">
              Candidates and parties are fictional. The constituency is real.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
