export function Statistics() {
  return (
    <section
      id="stats"
      className="py-20 lg:py-28 border-y border-border/50"
      aria-labelledby="stats-heading"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div
          className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Statistics"
        >
          <div
            className="text-center animate-scroll-reveal"
            style={{ animationDelay: "100ms" }}
            role="listitem"
          >
            <div className="font-heading text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl tabular-nums">
              3,977,049+
            </div>
            <p className="mt-2 text-sm text-muted-foreground font-medium">
              Files shared
            </p>
          </div>
          <div
            className="text-center animate-scroll-reveal"
            style={{ animationDelay: "200ms" }}
            role="listitem"
          >
            <div className="font-heading text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl tabular-nums">
              4,390,371+
            </div>
            <p className="mt-2 text-sm text-muted-foreground font-medium">
              Downloads
            </p>
          </div>
          <div
            className="text-center animate-scroll-reveal"
            style={{ animationDelay: "300ms" }}
            role="listitem"
          >
            <div className="font-heading text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl tabular-nums">
              975,882+
            </div>
            <p className="mt-2 text-sm text-muted-foreground font-medium">
              Active users
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}