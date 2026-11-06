"use client";

const BRANDS = [
  { name: "Google", svg: <GoogleIcon /> },
  { name: "Meta", svg: <MetaIcon /> },
  { name: "IBM", svg: <IbmIcon /> },
  { name: "NVIDIA", svg: <NvidiaIcon /> },
  { name: "Microsoft", svg: <MicrosoftIcon /> },
  { name: "Amazon", svg: <AmazonIcon /> },
] as const;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-auto" fill="currentColor">
      <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.327,0-6.033-2.706-6.033-6.033s2.706-6.033,6.033-6.033c1.545,0,2.929,0.632,3.911,1.585l2.814-2.814C17.513,1.501,15.189,0,12.545,0C7.03,0,2.514,4.516,2.514,10.031c0,2.112,0.679,4.034,1.788,5.576L0,24l5.341-1.621C7.549,23.497,10.143,24,12.545,24c5.515,0,10.031-4.516,10.031-10.031C22.576,14.729,20.397,12.419,17.272,10.239z" />
    </svg>
  );
}

function MetaIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-auto" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.865-.013-1.7-2.782.605-3.369-1.343-3.369-1.343-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.53 2.341 1.087 2.91.831.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.987 1.029-2.686-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.398.1 2.651.64.699 1.028 1.593 1.028 2.686 0 3.848-2.339 4.695-4.566 4.942.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .267.18.578.688.48A10.003 10.003 0 0022 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function IbmIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-auto" fill="currentColor">
      <path d="M2.5 4h19v2h-19zm0 4h19v2h-19zm0 4h19v2h-19zm0 4h19v2h-19zm0 4h19v2h-19z" />
    </svg>
  );
}

function NvidiaIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-auto" fill="currentColor">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l7.82 3.91L12 14.36 4.18 10.45 12 6.54zM4.18 13.55L12 17.46l7.82-3.91v-2.18L12 11.18 4.18 13.55z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-auto" fill="currentColor">
      <path d="M12.545 0c-5.515 0-10.031 4.516-10.031 10.031 0 5.515 4.516 10.031 10.031 10.031 5.515 0 10.031-4.516 10.031-10.031C22.576 4.516 18.06 0 12.545 0zM12.545 18.832c-4.839 0-8.786-3.947-8.786-8.786 0-4.839 3.947-8.786 8.786-8.786 4.839 0 8.786 3.947 8.786 8.786 0 4.839-3.947 8.786-8.786 8.786zm1.143-5.714H8.857V8.857h4.831v4.261zm0-7.143H8.857V1.714h4.831v4.261z" />
    </svg>
  );
}

function AmazonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-auto" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10C22 6.477 17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" />
      <path d="M8.5 14h7c.828 0 1.5-.672 1.5-1.5S16.328 11 15.5 11h-7C7.672 11 7 11.672 7 12.5s.672 1.5 1.5 1.5zm0-5h7c.828 0 1.5-.672 1.5-1.5S16.328 6 15.5 6h-7C7.672 6 7 6.672 7 7.5s.672 1.5 1.5 1.5z" />
    </svg>
  );
}

export function BrandStrip() {
  return (
    <section
      className="py-16 border-y border-border/50"
      aria-labelledby="brand-strip-heading"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center gap-8">
          <div className="text-center">
            <h2
              id="brand-strip-heading"
              className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
            >
              Designed for the way modern teams work
            </h2>
          </div>
          <div
            className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-40 hover:opacity-60 transition-opacity duration-300"
            aria-hidden="true"
          >
            {BRANDS.map((brand) => (
              <span key={brand.name} className="text-muted-foreground">
                {brand.svg}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}