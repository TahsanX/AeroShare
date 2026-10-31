import Link from "next/link"
import { WindIcon } from "lucide-react"

import { ThemeToggle } from "@/components/theme/theme-toggle"

export function Header() {
  return (
    <header className="border-b border-border/60">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <WindIcon className="size-4 text-primary" aria-hidden />
          AeroShare
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
