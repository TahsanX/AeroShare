"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "How do I upload a file?",
    answer:
      "Drag a file into the upload area or click to browse your device. The file is validated for type and size, then uploads with real-time progress. You can cancel at any time.",
  },
  {
    question: "How do I share a file?",
    answer:
      "After the upload completes, a share link is generated automatically. Click the Copy button to copy the link to your clipboard, then paste it wherever you want to share it.",
  },
  {
    question: "Does someone need an account to download a file?",
    answer:
      "No. Anyone with the share link can download the file directly from the download page without signing up or logging in.",
  },
  {
    question: "Which file types are supported?",
    answer:
      "All file types are supported. The service does not restrict uploads by file extension or MIME type.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "Yes. The maximum file size is 50 MB per upload. Files larger than 5 MB use multipart upload automatically for reliability.",
  },
  {
    question: "How long does a share link work?",
    answer:
      "You can choose the expiry when uploading: 1 day or 7 days. After the selected period, the file is automatically deleted and the link stops working.",
  },
  {
    question: "Can I use the website on my phone?",
    answer:
      "Yes. The website is fully responsive and works on mobile browsers, tablets, and desktop computers.",
  },
  {
    question: "Is file sharing free?",
    answer:
      "Yes. There is no charge to upload, share, or download files.",
  },
] as const;

function AccordionItem({
  index,
  item,
}: {
  index: number;
  item: FAQItem;
}) {
  const [open, setOpen] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const triggerId = `faq-trigger-${index}`;
  const contentId = `faq-content-${index}`;

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full flex items-center justify-between gap-4 py-5 text-left text-base font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => setOpen(!open)}
      >
        <span className="pr-4">{item.question}</span>
        <ChevronDownIcon
          className={`size-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        className="overflow-hidden"
      >
        <div
          ref={contentRef}
          className={`transition-all duration-300 ease-in-out ${
            open ? "max-h-[500px] opacity-100 pt-2 pb-6" : "max-h-0 opacity-0 pt-0 pb-0"
          }`}
        >
          <div className="text-muted-foreground leading-relaxed text-base">
            {item.answer}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  return (
    <section
      id="faq"
      className="py-20 lg:py-28"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center mb-12 animate-scroll-reveal">
          <h2
            id="faq-heading"
            className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Answers to common questions about file sharing.
          </p>
        </div>

        <div
          className="rounded-2xl border bg-card ring-1 ring-foreground/5 overflow-hidden animate-scroll-reveal delay-1"
          role="region"
          aria-label="FAQ"
        >
          <div className="p-4 md:p-6">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem key={item.question} index={index} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}