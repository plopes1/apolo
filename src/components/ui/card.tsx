import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
} & Record<`aria-${string}`, string | undefined>) {
  return (
    <Tag className={`min-w-0 rounded-3xl border border-line bg-surface p-5 sm:p-6 ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  eyebrow,
  title,
  action,
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{eyebrow}</p>}
        <h2 id={id} className="text-[17px] font-semibold leading-snug text-ink">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
