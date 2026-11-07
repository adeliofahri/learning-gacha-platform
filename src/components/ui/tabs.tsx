import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** Tab berbasis link (state di URL, dapat diakses keyboard & dibagikan). */
export function LinkTabs({
  items,
  active,
}: {
  items: { key: string; label: string; href: string }[];
  active: string;
}) {
  return (
    <div role="tablist" className="bg-muted inline-flex rounded-lg p-1">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          role="tab"
          aria-selected={t.key === active}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
            t.key === active
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
