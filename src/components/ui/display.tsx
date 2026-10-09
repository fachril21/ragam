import Link from "next/link";
import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "success" | "warning" | "error" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-surface text-text",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  accent: "bg-accent text-on-accent",
};

export function Badge({
  tone = "neutral",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-neutral-200", className)} />;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Jejak halaman (breadcrumb)" className="text-sm text-text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link href={item.href} className="underline-offset-2 hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={cn(isLast && "text-text")}>
                  {item.label}
                </span>
              )}
              {!isLast && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
  query?: Record<string, string>;
}

function pageHref(basePath: string, query: Record<string, string>, page: number): string {
  const params = new URLSearchParams(query);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({ page, totalPages, basePath, query = {} }: PaginationProps) {
  if (totalPages <= 1) return null;
  const href = (p: number) => pageHref(basePath, query, p);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const linkClass = "inline-flex size-10 items-center justify-center rounded-md border border-border text-sm hover:bg-surface";
  return (
    <nav aria-label="Halaman" className="flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} className={cn(linkClass, "w-auto px-3")}>
          Sebelumnya
        </Link>
      )}
      {pages.map((p) =>
        p === page ? (
          <span
            key={p}
            aria-current="page"
            className="inline-flex size-10 items-center justify-center rounded-md bg-primary text-sm text-on-primary"
          >
            {p}
          </span>
        ) : (
          <Link key={p} href={href(p)} className={linkClass}>
            {p}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={href(page + 1)} className={cn(linkClass, "w-auto px-3")}>
          Berikutnya
        </Link>
      )}
    </nav>
  );
}
