export interface CountAnimationOptions {
  from: number;
  to: number;
  duration: number;
  delay?: number;
  easing?: (t: number) => number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

export function animateCount({
  from,
  to,
  duration,
  delay = 0,
  easing = (t) => 1 - Math.pow(1 - t, 3),
  onUpdate,
  onComplete,
}: CountAnimationOptions): () => void {
  let startTime: number;
  let animationFrame: number;
  let cancelled = false;

  const animate = (timestamp: number) => {
    if (cancelled) return;

    if (!startTime) startTime = timestamp;

    const elapsed = timestamp - startTime - delay;
    if (elapsed < 0) {
      animationFrame = requestAnimationFrame(animate);
      return;
    }

    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);
    const currentValue = from + (to - from) * easedProgress;

    onUpdate(currentValue);

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  };

  animationFrame = requestAnimationFrame(animate);

  return () => {
    cancelled = true;
    cancelAnimationFrame(animationFrame);
  };
}

export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    grouping?: boolean;
    locale?: string;
    pad?: number;
  } = {}
): string {
  const { decimals = 0, grouping = false, locale = "en-US", pad = 1 } = options;

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouping,
  }).format(value);

  if (pad > 1 && !formatted.includes(".")) {
    return formatted.padStart(pad, "0");
  }
  return formatted;
}