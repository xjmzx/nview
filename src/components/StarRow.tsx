import { cn } from "../lib/cn";
import { starRating } from "../lib/rating";

type Props = {
  up: number;
  down: number;
  size?: "xs" | "sm" | "md";
  /** Render empty stars when the rating is 0 instead of hiding. */
  showWhenUnrated?: boolean;
  className?: string;
};

const SIZES = {
  xs: "w-2.5 h-2.5",
  sm: "w-3 h-3",
  md: "w-4 h-4",
};

// 0–5 star row derived from net up/down reactions (lib/rating). Hidden when
// unrated unless `showWhenUnrated`. Mirrors the glmps web viewer's StarRow.
export function StarRow({
  up,
  down,
  size = "sm",
  showWhenUnrated = false,
  className,
}: Props) {
  const stars = starRating(up, down);
  if (stars === 0 && !showWhenUnrated) return null;

  const dim = SIZES[size];
  return (
    <span
      className={cn("inline-flex items-center", className)}
      aria-label={`${stars} of 5 stars`}
      title={`${stars}/5 · ${up}↑ ${down}↓`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          className={cn(dim, i < stars ? "text-accent" : "text-muted/25")}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2.5l2.6 6.4 6.9.5-5.2 4.5 1.6 6.8L12 17.2l-5.9 3.5 1.6-6.8L2.5 9.4l6.9-.5L12 2.5z" />
        </svg>
      ))}
    </span>
  );
}
