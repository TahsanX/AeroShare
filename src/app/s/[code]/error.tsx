"use client";

import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

export default function ShareError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <TriangleAlertIcon className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <h1 className="text-lg font-medium">Something went wrong</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We could not show this page. Please try again.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Link href="/" className={buttonVariants()}>
          Upload a file
        </Link>
      </div>
    </div>
  );
}
