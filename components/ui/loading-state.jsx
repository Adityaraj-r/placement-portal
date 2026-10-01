import { cn } from "@/lib/utils";

export function LoadingState({ label, children, className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      aria-busy="true"
      className={cn("min-w-0", className)}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}
