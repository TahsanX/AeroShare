"use client";

import { UploadCard } from "@/components/upload/upload-card";

export function ProductShowcase() {
  return (
    <section
      id="showcase"
      className="py-20 lg:py-28"
      aria-labelledby="showcase-heading"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-12 animate-scroll-reveal">
          <h2
            id="showcase-heading"
            className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            See it in action
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            The real upload component — try it yourself.
          </p>
        </div>

        <div className="animate-scroll-reveal delay-1">
          <div className="mx-auto max-w-2xl">
            <UploadCard />
          </div>
        </div>
      </div>
    </section>
  );
}