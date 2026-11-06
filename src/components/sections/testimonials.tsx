"use client";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Finally a file sharing tool that just works. No accounts, no fuss — upload and share.",
    name: "Sarah Chen",
    role: "Designer",
    initials: "SC",
  },
  {
    quote: "My team uses this daily for quick asset handoffs. The link expiry gives us peace of mind.",
    name: "Marcus Johnson",
    role: "Developer",
    initials: "MJ",
  },
  {
    quote: "Simple, fast, and reliable. Exactly what we needed for client file deliveries.",
    name: "Emma Rodriguez",
    role: "Project Manager",
    initials: "ER",
  },
] as const;

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="py-20 lg:py-28"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-12 animate-scroll-reveal">
          <h2
            id="testimonials-heading"
            className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            Trusted by teams everywhere
          </h2>
        </div>

        <div
          className="grid gap-6 md:grid-cols-3"
          role="list"
          aria-label="Testimonials"
        >
          {TESTIMONIALS.map((testimonial, index) => (
            <article
              key={testimonial.name}
              className="rounded-2xl border bg-card p-6 ring-1 ring-foreground/5 animate-scroll-reveal transition-all hover:ring-primary/20 hover:border-primary/20"
              style={{ animationDelay: `${(index + 1) * 100}ms` }}
              role="listitem"
            >
              <svg
                className="size-6 text-primary/50 mb-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.433.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.434.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <blockquote className="mb-6">
                <p className="text-foreground leading-relaxed">
                  {testimonial.quote}
                </p>
              </blockquote>
              <footer className="flex items-center gap-3">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium"
                  aria-hidden="true"
                >
                  {testimonial.initials}
                </div>
                <div>
                  <cite className="not-italic font-medium">{testimonial.name}</cite>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}