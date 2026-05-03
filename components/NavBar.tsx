"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Route } from "next";

type NavItem = {
  href: "/" | "/matrix" | "/journey";
  label: string;
  // Whether this destination consumes the user's priority list.
  // /matrix reads ?priorities=...; /journey and / do not.
  carriesPriorities: boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Pick priorities", carriesPriorities: false },
  { href: "/matrix", label: "Matrix", carriesPriorities: true },
  { href: "/journey", label: "Voter journey", carriesPriorities: false }
];

export function NavBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prioritiesParam = searchParams.get("priorities") ?? "";

  return (
    <nav aria-label="Primary">
      <ul className="flex items-center gap-0.5 text-sm">
        {NAV_ITEMS.map((item) => {
          const href =
            item.carriesPriorities && prioritiesParam.length > 0
              ? (`${item.href}?priorities=${encodeURIComponent(prioritiesParam)}` as Route)
              : (item.href as Route);
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
