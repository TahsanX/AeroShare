"use client";

import { cn } from "cn";
import { FileUp, Upload, Link2, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

interface Step {
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    icon: FileUp,
    title: "Choose a file",
    description: "Select a file from your device or drag it into the upload area. We validate the file type and size before sending.",
  },
  {
    number: "02",
    icon: Upload,
    title: "Upload your file",
    description: "The file uploads with real-time progress. You can cancel at any time. Large files use multipart upload automatically.",
  },
  {
    number: "03",
    icon: Link2,
    title: "Share the link",
    description: "Copy the generated share link and send it to anyone. They can download immediately without an account.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-20 lg:py-28 bg-secondary/30"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-16 animate-scroll-reveal">
          <h2
            id="how-it-works-heading"
            className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            How file sharing works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps from file to shareable link.
          </p>
        </div>

        <div className="relative">
          <div
            className="absolute left-1/2 top-0 bottom-0 w-px bg-border/50 -translate-x-1/2 hidden lg:block"
            aria-hidden="true"
          />

          <div className="space-y-16">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className={cn(
                  "relative flex gap-8 animate-scroll-reveal",
                  `delay-${index + 1}`
                )}
              >
                <div className="relative flex shrink-0 flex-col items-center lg:w-20">
                  <span className="text-3xl font-heading font-bold text-primary/30 lg:text-4xl">
                    {step.number}
                  </span>
                  <div
                    className="relative mt-2 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background z-10"
                  >
                    <step.icon className="size-6" aria-hidden />
                  </div>
                </div>

                <div className="flex-1 pt-2 lg:pt-0">
                  <h3 className="font-heading text-xl font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center animate-scroll-reveal delay-4">
          <a
            href="#upload"
            className={cn(buttonVariants({ variant: "default", size: "lg" }), "inline-flex")}
          >
            Upload a file
            <ArrowRight className="ml-2 size-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}