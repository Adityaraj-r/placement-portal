import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({ title, description, action, className }) {
  return (
    <section
      aria-labelledby="empty-state-title"
      className={cn(
        "flex min-w-0 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center sm:px-8",
        className,
      )}
    >
      <Inbox aria-hidden="true" className="mb-3 h-8 w-8 text-muted-foreground" />
      <h2 id="empty-state-title" className="text-base font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
