"use client";

import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section
      id="cta"
      className="py-20 lg:py-28 bg-primary/5 border-y border-border/50"
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-7xl px-4 text-center">
        <h2
          id="cta-heading"
          className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl animate-scroll-reveal"
        >
          Ready to share a file?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground animate-scroll-reveal delay-1">
          Upload a file and get a share link in seconds.
        </p>
        <div className="mt-8 animate-scroll-reveal delay-2">
          <a
            href="#upload"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "inline-flex gap-2"
            )}
          >
            Upload a file
            <ArrowRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}