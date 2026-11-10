"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { animateCount, formatNumber } from "@/lib/count-animation";

export interface CountingNumberProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number;
  from?: number;
  decimals?: number;
  grouping?: boolean;
  locale?: string;
  duration?: number;
  delay?: number;
  pad?: number;
}

export function CountingNumber({
  value,
  from = 0,
  decimals = 0,
  grouping = false,
  locale = "en-US",
  duration = 2000,
  delay = 0,
  pad = 1,
  className,
  ...rest
}: CountingNumberProps) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    const cleanup = animateCount({
      from,
      to: value,
      duration,
      delay,
      onUpdate: setCount,
    });
    return cleanup;
  }, [value, from, duration, delay]);

  const formattedValue = formatNumber(count, { decimals, grouping, locale, pad });

  return (
    <span {...rest} className={cn("tabular-nums", className)}>
      {formattedValue}
    </span>
  );
}