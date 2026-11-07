import * as React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Progress({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-label={label ?? "Progress"}
      className={cn("bg-muted h-2.5 w-full overflow-hidden rounded-full", className)}
    >
      <div
        className="from-primary h-full rounded-full bg-gradient-to-r to-fuchsia-500 transition-all"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: "info" | "error" | "success" | "warning";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = variant === "error" ? AlertCircle : variant === "success" ? CheckCircle2 : Info;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-md border p-3 text-sm",
        variant === "error" && "border-destructive/30 bg-destructive/5 text-destructive",
        variant === "success" && "border-success/30 bg-success/10 text-success",
        variant === "warning" && "border-accent/50 bg-accent/15 text-accent-foreground",
        variant === "info" && "border-primary/20 bg-primary/5 text-foreground",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-card/50 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center">
      <p className="text-base font-semibold">{title}</p>
      {description && <p className="text-muted-foreground max-w-md text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="bg-card w-full overflow-x-auto rounded-lg border">
      <table
        className={cn("w-full text-left text-sm [&_tbody>tr:last-child>td]:border-b-0", className)}
        {...props}
      />
    </div>
  );
}
export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "bg-muted/60 text-muted-foreground border-b px-3 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap uppercase",
        className,
      )}
      {...props}
    />
  );
}
export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b px-3 py-2.5 align-top", className)} {...props} />;
}

/** Pagination berbasis query string (server-side). */
export function Pagination({
  page,
  total,
  pageSize,
  baseHref,
  params = {},
}: {
  page: number;
  total: number;
  pageSize: number;
  baseHref: string;
  params?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `${baseHref}?${sp.toString()}`;
  };
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Halaman {page} dari {pages} · {total} data
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            className="bg-card hover:bg-muted rounded-md border px-3 py-1.5"
            href={href(page - 1)}
          >
            Sebelumnya
          </Link>
        ) : null}
        {page < pages ? (
          <Link
            className="bg-card hover:bg-muted rounded-md border px-3 py-1.5"
            href={href(page + 1)}
          >
            Berikutnya
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
