"use client";

import Link from "next/link";
import { WindIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
] as const;

export function Header() {
  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-7xl px-4">
      <nav className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl border bg-card/80 backdrop-blur-nav px-4 py-3 ring-1 ring-foreground/5 shadow-xl">
        <div className="flex items-center gap-1 md:order-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden md:inline-flex px-3 py-1.5 text-sm font-medium rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight md:order-2"
          aria-label="AeroShare home"
        >
          <WindIcon className="size-4 text-primary" aria-hidden />
          AeroShare
        </Link>

        <div className="hidden md:flex md:order-3 md:items-center md:gap-2">
          <Link
            href="#upload"
            className={buttonVariants({ variant: "default", size: "sm", className: "px-4" })}
          >
            Upload a file
          </Link>
        </div>
      </nav>
    </header>
  );
}