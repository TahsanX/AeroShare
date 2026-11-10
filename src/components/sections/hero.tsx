"use client";

import { UploadCard } from "@/components/upload/upload-card";

export function Hero() {
  return (
    <section
      id="upload"
      className="relative pt-32 pb-20 px-4 sm:pt-40 sm:pb-28 lg:pt-48 lg:pb-36"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center space-y-6 mb-12 animate-scroll-reveal">
          <h1
            id="hero-heading"
            className="text-gradient-hero font-heading text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Share files simply.
          </h1>
        </div>
        <div className="animate-scroll-reveal delay-1">
          <UploadCard />
        </div>

        <p
          className="mt-6 text-center text-sm text-muted-foreground animate-scroll-reveal delay-2"
          id="upload-hint"
        >
          One file, up to 50 MB. Links expire after 1 or 7 days.
        </p>
      </div>

      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
        aria-hidden
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-muted-foreground/50"
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}