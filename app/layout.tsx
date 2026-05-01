import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeOff",
  description:
    "Manifesto literacy tool for Indian voters. Compare candidates on the issues you care about, scored against a five-dimension rubric."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          Skip to main content
        </a>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link href="/" className="font-semibold tracking-tight text-slate-900" aria-label="TradeOff home">
              TradeOff
            </Link>
            <nav aria-label="Primary">
              <ul className="flex items-center gap-1 text-sm">
                {[
                  { href: "/", label: "Pick priorities" },
                  { href: "/matrix", label: "Matrix" },
                  { href: "/missing", label: "What's missing" },
                  { href: "/journey", label: "Voter journey" }
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded px-3 py-1.5 text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
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
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          v1 demo • West Bengal · Bhabanipur (AC #159) • candidates and parties are fictional; the constituency is real.
        </footer>
      </body>
    </html>
  );
}
