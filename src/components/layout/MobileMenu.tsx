"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavLink } from "./nav";

export function MobileMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-surface focus-visible:outline-accent rounded-md px-3 py-2 text-sm focus-visible:outline-2"
      >
        {open ? "Tutup" : "Menu"}
      </button>
      <nav
        id="mobile-menu"
        aria-label="Menu seluler"
        hidden={!open}
        className="border-border bg-background shadow-card absolute inset-x-0 top-16 border-b px-4 py-3"
      >
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className="hover:bg-surface block rounded-md px-2 py-3 text-base"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
