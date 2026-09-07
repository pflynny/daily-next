import { cn } from "@/lib/utils/cn";

export function Button({ variant = "secondary", size = "normal", className, type = "button", ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "normal" | "icon";
  }) {
  return <button type={type} {...props} className={cn(
    "app-button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    size === "icon" ? "size-11 p-2" : "min-h-11 px-4 py-2",
    variant === "primary" && "border-brand-700 bg-brand-700 text-white hover:bg-brand-800",
    variant === "secondary" && "border-line bg-surface text-ink hover:bg-sand",
    variant === "danger" && "border-danger bg-danger text-white hover:opacity-90",
    variant === "ghost" && "border-transparent text-muted hover:bg-sand hover:text-ink",
    className,
  )} />;
}
