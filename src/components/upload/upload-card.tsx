"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Copy, File as FileIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_EXPIRY,
  MAX_FILE_SIZE,
  type CompleteUploadResponse,
  type ExpiryOption,
} from "@/shared/contracts";
import { formatBytes, formatExpiry } from "@/lib/client/format";
import { UploadError, uploadFile } from "@/lib/client/uploader";
import { Dropzone } from "./dropzone";

type Phase =
  | { name: "idle" }
  | { name: "uploading"; loaded: number; total: number }
  | { name: "success"; result: CompleteUploadResponse }
  | { name: "error"; message: string };

const EXPIRY_ITEMS: { value: ExpiryOption; label: string }[] = [
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
];

function validate(file: File): string | null {
  if (file.size === 0) return "This file is empty. Choose a file with some content.";
  if (file.size > MAX_FILE_SIZE) {
    const max = formatBytes(MAX_FILE_SIZE);
    // Just over the limit both values round to the same label, so show exact bytes.
    const size =
      formatBytes(file.size) === max ? `${file.size.toLocaleString("en-US")} bytes` : formatBytes(file.size);
    return `"${file.name}" is ${size}. The maximum file size is ${max}.`;
  }
  return null;
}

export function UploadCard() {
  const [file, setFile] = useState<File | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<ExpiryOption>(DEFAULT_EXPIRY);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [copied, setCopied] = useState(false);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  const choose = useCallback((f: File) => {
    const err = validate(f);
    if (err) {
      setPickError(err);
      return;
    }
    setPickError(null);
    setFile(f);
    setPhase({ name: "idle" });
  }, []);

  const reset = () => {
    setFile(null);
    setPickError(null);
    setPhase({ name: "idle" });
    setCopied(false);
  };

  const start = async () => {
    if (!file) return;
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setPhase({ name: "uploading", loaded: 0, total: file.size });
    try {
      const result = await uploadFile(file, {
        expiresIn,
        signal: ctrl.signal,
        onProgress: (loaded, total) => setPhase({ name: "uploading", loaded, total }),
      });
      setPhase({ name: "success", result });
    } catch (err) {
      if (err instanceof UploadError && err.code === "ABORTED") {
        setPhase({ name: "idle" });
        return;
      }
      setPhase({
        name: "error",
        message: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      if (ctrlRef.current === ctrl) ctrlRef.current = null;
    }
  };

  const cancel = () => ctrlRef.current?.abort();

  const shareUrl =
    phase.name === "success" ? `${window.location.origin}${phase.result.sharePath}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the link and copy it manually.");
    }
  };

  const uploading = phase.name === "uploading";

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{phase.name === "success" ? "Your link is ready" : "Upload a file"}</CardTitle>
        <CardDescription>
          {phase.name === "success"
            ? "Anyone with this link can download the file."
            : `Up to ${formatBytes(MAX_FILE_SIZE)} per file.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase.name === "success" && file ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileIcon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{file.name}</span>
              <Badge variant="secondary">{formatBytes(file.size)}</Badge>
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                aria-label="Share link"
                onFocus={(e) => e.currentTarget.select()}
                className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
              <Button size="lg" onClick={copy}>
                {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Expires {formatExpiry(phase.result.expiresAt)}.
            </p>
            <Button variant="outline" size="lg" onClick={reset}>
              Upload another
            </Button>
          </div>
        ) : (
          <>
            {!file ? (
              <Dropzone onFile={choose} error={pickError} />
            ) : (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FileIcon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove file"
                  disabled={uploading}
                  onClick={reset}
                >
                  <X />
                </Button>
              </div>
            )}

            {file && (
              <div className="flex items-center justify-between gap-3">
                <label id="expiry-label" className="text-sm text-muted-foreground">
                  Link expires after
                </label>
                <Select
                  value={expiresIn}
                  items={EXPIRY_ITEMS}
                  onValueChange={(v) => v && setExpiresIn(v as ExpiryOption)}
                  disabled={uploading}
                >
                  <SelectTrigger aria-labelledby="expiry-label" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_ITEMS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {phase.name === "error" && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{phase.message}</span>
              </div>
            )}

            {uploading && (
              <div className="flex items-center gap-3">
                <Progress
                  className="min-w-0 flex-1"
                  value={Math.round((phase.loaded / Math.max(phase.total, 1)) * 100)}
                >
                  <ProgressLabel>Uploading</ProgressLabel>
                  <ProgressValue />
                </Progress>
                <Button variant="outline" size="lg" onClick={cancel}>
                  Cancel
                </Button>
              </div>
            )}

            {file && !uploading && (
              <Button size="lg" className="w-full" onClick={start}>
                {phase.name === "error" ? "Try again" : "Upload"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
