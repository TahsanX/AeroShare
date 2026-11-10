"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ClockIcon,
  DownloadIcon,
  FileIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchXIcon,
  TimerOffIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DownloadError,
  fetchDownloadUrl,
  fetchFileMeta,
  triggerBrowserDownload,
  type DownloadFailure,
} from "@/lib/client/downloader";
import { formatBytes, formatExpiry } from "@/lib/client/format";
import type { FileMeta } from "@/shared/contracts/files";

type State =
  | { status: "loading" }
  | { status: "ready"; meta: FileMeta }
  | { status: "failed"; failure: DownloadFailure };

function toFailure(e: unknown): DownloadFailure {
  return e instanceof DownloadError
    ? e.failure
    : { kind: "error", message: "Something went wrong." };
}

export function DownloadCard({ code }: { code: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchFileMeta(code, ctrl.signal)
      .then((meta) => setState({ status: "ready", meta }))
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setState({ status: "failed", failure: toFailure(e) });
      });
    return () => ctrl.abort();
  }, [code, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  if (state.status === "loading") return <LoadingCard />;
  if (state.status === "ready") return <ReadyCard code={code} meta={state.meta} />;
  return <FailureCard failure={state.failure} onRetry={retry} />;
}

export function LoadingCard() {
  return (
    <Card aria-busy="true" aria-label="Loading file details">
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="size-12 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
      </CardContent>
    </Card>
  );
}

function ReadyCard({ code, meta }: { code: string; meta: FileMeta }) {
  const [busy, setBusy] = useState(false);
  const cooldown = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (cooldown.current) clearTimeout(cooldown.current);
    },
    [],
  );

  async function onDownload() {
    if (busy) return;
    setBusy(true);
    try {
      const { url, name } = await fetchDownloadUrl(code);
      triggerBrowserDownload(url, name);
    } catch (e) {
      const f = toFailure(e);
      toast.error(
        f.kind === "expired"
          ? "This file has expired."
          : f.kind === "not-found"
            ? "This file is no longer available."
            : f.kind === "rate-limited"
              ? `Too many requests. Try again in ${f.retryAfterSeconds}s.`
              : f.message,
      );
    } finally {
      // Keep the button disabled briefly to avoid repeated clicks.
      cooldown.current = setTimeout(() => setBusy(false), 1500);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileIcon className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-medium" title={meta.name}>
              {meta.name}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {formatBytes(meta.size)} · {meta.mime || "unknown type"}
            </p>
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ClockIcon className="size-4" aria-hidden />
          Expires {formatExpiry(meta.expiresAt)}
        </p>
        <Button size="lg" className="h-9 w-full" onClick={onDownload} disabled={busy}>
          {busy ? (
            <Loader2Icon className="animate-spin" aria-hidden />
          ) : (
            <DownloadIcon aria-hidden />
          )}
          {busy ? "Preparing..." : "Download"}
        </Button>
      </CardContent>
    </Card>
  );
}

function describeFailure(f: DownloadFailure): {
  icon: LucideIcon;
  title: string;
  text: string;
} {
  switch (f.kind) {
    case "not-found":
      return {
        icon: SearchXIcon,
        title: "File not found",
        text: "This link is invalid or the file was removed.",
      };
    case "expired":
      return {
        icon: TimerOffIcon,
        title: "This file has expired",
        text: "Files are deleted automatically after a short time.",
      };
    case "rate-limited":
      return {
        icon: ClockIcon,
        title: "Too many requests",
        text: `Please try again in ${f.retryAfterSeconds} seconds.`,
      };
    default:
      return { icon: TriangleAlertIcon, title: "Could not load file", text: f.message };
  }
}

function FailureCard({
  failure,
  onRetry,
}: {
  failure: DownloadFailure;
  onRetry: () => void;
}) {
  const { icon: Icon, title, text } = describeFailure(failure);
  const retryable = failure.kind === "error" || failure.kind === "rate-limited";
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-base font-medium">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{text}</p>
        </div>
        {retryable && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCwIcon aria-hidden /> Retry
          </Button>
        )}
        <Link
          href="/"
          className={buttonVariants({ variant: retryable ? "ghost" : "default" })}
        >
          Upload a file
        </Link>
      </CardContent>
    </Card>
  );
}
