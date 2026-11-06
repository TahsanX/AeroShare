"use client";

export function TaglineReveal() {
  return (
    <section
      id="tagline"
      className="py-20 lg:py-28 border-y border-border/50"
      aria-labelledby="tagline-heading"
    >
      <div className="mx-auto max-w-7xl px-4 text-center">
        <h2 id="tagline-heading" className="sr-only">
          Our promise
        </h2>
        <p className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1] text-center">
          Share files simply.
        </p>
      </div>
    </section>
  );
}