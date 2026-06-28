import { cn } from "@/lib/utils/cn";

export function Screen({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("thin-scrollbar min-h-0 flex-1 overflow-y-auto", className)}>
      {children}
    </div>
  );
}
