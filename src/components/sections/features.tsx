"use client";

import { cn } from "cn";
import { FileUp, Link2, CheckCheck, Download, Shield, Smartphone } from "lucide-react";

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: FileUp,
    title: "Simple uploads",
    description: "Drag and drop or click to select. One file at a time, up to 50 MB.",
  },
  {
    icon: Link2,
    title: "Shareable links",
    description: "Get a short link instantly after upload. Anyone with the link can download.",
  },
  {
    icon: CheckCheck,
    title: "Clear feedback",
    description: "Real-time upload progress with cancel option. Know exactly when it's done.",
  },
  {
    icon: Download,
    title: "Easy downloads",
    description: "Recipients get a clean download page with file details and expiry info.",
  },
  {
    icon: Shield,
    title: "Validated files",
    description: "Automatic file type and size validation before upload starts.",
  },
  {
    icon: Smartphone,
    title: "Mobile friendly",
    description: "Works seamlessly on phone, tablet, and desktop browsers.",
  },
] as const;

export function Features() {
  return (
    <section
      id="features"
      className="py-20 lg:py-28"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-16 animate-scroll-reveal">
          <h2
            id="features-heading"
            className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            Everything you need to share files
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Focused features that make file sharing straightforward and reliable.
          </p>
        </div>

        <div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Features"
        >
          {FEATURES.map((feature, index) => (
            <article
              key={feature.title}
              className={cn(
                "group relative p-6 rounded-2xl border bg-card ring-1 ring-foreground/5 transition-all duration-300 hover:ring-primary/20 hover:border-primary/20 animate-scroll-reveal",
                `delay-${(index % 4) + 1}`
              )}
              role="listitem"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <feature.icon className="size-5" aria-hidden />
              </div>
              <h3 className="font-heading text-lg font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}