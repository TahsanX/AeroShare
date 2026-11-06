"use client";

import Link from "next/link";
import { WindIcon } from "lucide-react";

const FOOTER_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
] as const;

export function Footer() {
  return (
    <footer
      className="border-t border-border/50 py-12"
      role="contentinfo"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 md:grid-cols-4 text-center md:text-left">
          <div className="space-y-4 mx-auto md:mx-0">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight"
              aria-label="AeroShare home"
            >
              <WindIcon className="size-4 text-primary" aria-hidden />
              AeroShare
            </Link>
            <p className="text-sm text-muted-foreground">
              Simple, fast file sharing. Upload a file and share a link. Files
              expire automatically.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <h3 className="font-medium mb-4">Navigate</h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h3 className="font-medium mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h3 className="font-medium mb-4">Contact</h3>
            <address className="not-italic text-sm text-muted-foreground space-y-2">
              <p>GitHub: <a href="https://github.com" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">github.com/aeroshare</a></p>
              <p>Email: <a href="mailto:hello@aeroshare.example" className="underline hover:text-foreground">hello@aeroshare.example</a></p>
            </address>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>&copy; 2026 AeroShare. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}