"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "cn";
import { MAX_FILE_SIZE } from "@/shared/contracts";
import { formatBytes } from "@/lib/client/format";

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  error?: string | null;
}

export function Dropzone({ onFile, disabled, error }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // Counter avoids flicker when dragging over child elements.
  const depth = useRef(0);

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-describedby="dropzone-hint"
        aria-label="Choose a file to upload, or drag and drop it here"
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current++;
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          depth.current = 0;
          setDragging(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground/30 hover:bg-muted/50",
          error && !dragging && "border-destructive/60",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UploadCloud className="size-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {dragging ? "Drop to select" : "Drag a file here, or click to browse"}
          </p>
          <p id="dropzone-hint" className="text-xs text-muted-foreground">
            One file, up to {formatBytes(MAX_FILE_SIZE)}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
