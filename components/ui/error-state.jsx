import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function ErrorState({ title, description, action, className }) {
  return (
    <section
      role="alert"
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5",
        className,
      )}
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      <div className="min-w-0">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </section>
  );
}
