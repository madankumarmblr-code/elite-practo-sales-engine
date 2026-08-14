import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "slate",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "slate" | "teal" | "amber" | "rose" | "blue" | "violet";
}) {
  const tones = {
    slate: "bg-slate-800 text-slate-200",
    teal: "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30",
    amber: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    rose: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
    blue: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
    violet: "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
