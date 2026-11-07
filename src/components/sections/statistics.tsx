"use client";

import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, durationMs = 1800) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;

        const startTime = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - startTime) / durationMs, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setValue(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, durationMs]);

  return { ref, value };
}

const stats = [
  { target: 847293, label: "Files shared", delay: "100ms" },
  { target: 791628, label: "Downloads", delay: "200ms" },
  { target: 812954, label: "Active users", delay: "300ms" },
];

function StatItem({
  target,
  label,
  delay,
}: {
  target: number;
  label: string;
  delay: string;
}) {
  const { ref, value } = useCountUp(target);

  return (
    <div
      ref={ref}
      className="text-center animate-scroll-reveal"
      style={{ animationDelay: delay }}
      role="listitem"
    >
      <div className="font-heading text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl tabular-nums">
        {value.toLocaleString()}+
      </div>
      <p className="mt-2 text-sm text-muted-foreground font-medium">
        {label}
      </p>
    </div>
  );
}

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
          {stats.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
