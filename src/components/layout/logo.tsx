import { cn } from "@/lib/utils";

/** API Sentinel mark. "inverse" is for dark surfaces such as the sidebar. */
export function Logo({ className, variant = "default" }: { className?: string; variant?: "default" | "inverse" }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg border",
        variant === "inverse"
          ? "border-sidebar-primary/40 bg-sidebar-primary text-sidebar-primary-foreground"
          : "border-primary/20 bg-primary text-primary-foreground",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
        <path d="M12 2.5 4 5.5v6c0 4.7 3.3 8.9 8 10 4.7-1.1 8-5.3 8-10v-6l-8-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M7.5 12.5h2.2l1.4-3 2 6 1.4-3h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
