import type { ReactNode } from "react";
import Link from "next/link";
import { cx } from "@/lib/utils";
import type { Tone } from "@/lib/constants";

/* ------------------------------ layout ------------------------------ */

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {icon ? <div className="icon-box-primary size-11 shrink-0">{icon}</div> : null}
        <div>
          <h1 className="section-title">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className,
  pad = true,
  id,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
  id?: string;
}) {
  return (
    <div id={id} className={cx("card", pad && "card-pad", className)}>
      {children}
    </div>
  );
}

export function CardHead({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mb-4 flex items-start justify-between gap-3", className)}>
      <div>
        <h2 className="card-title">{title}</h2>
        {description ? <p className="card-description mt-0.5">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("space-y-4", className)}>{children}</div>;
}

/* ------------------------------ stats ------------------------------- */

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  href?: string;
}) {
  const color =
    tone === "success"
      ? "var(--success)"
      : tone === "destructive"
        ? "var(--destructive)"
        : tone === "warning"
          ? "var(--warning)"
          : tone === "muted"
            ? "var(--muted-foreground)"
            : "var(--primary)";

  const body = (
    <div className="card card-pad h-full transition-colors hover:border-[color-mix(in_oklab,var(--primary)_45%,transparent)]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xs font-bold uppercase tracking-wide muted">{label}</span>
        {icon ? (
          <span className="icon-box-soft shrink-0" style={{ color }}>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 num text-2xl font-extrabold tracking-tight" style={{ color }}>
        {value}
      </div>
      {hint ? <div className="mt-1.5 text-xs muted">{hint}</div> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/* ------------------------------ badges ------------------------------ */

export function Badge({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return <span className={cx(`badge badge-${tone}`, className)}>{children}</span>;
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block size-1.5 rounded-full" style={{ background: color }} />;
}

/* ------------------------------ tables ------------------------------ */

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("table-wrap", className)}>
      <table className="table">{children}</table>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      {icon ? <div className="icon-box size-12">{icon}</div> : null}
      <p className="text-base font-bold">{title}</p>
      {description ? <p className="max-w-md text-sm muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* ------------------------------ forms ------------------------------- */

export function Field({
  label,
  children,
  hint,
  className,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="label">
        {label}
        {required ? <span className="text-[color:var(--destructive)]"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs muted">{hint}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx("input", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx("select", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx("textarea", props.className)} />;
}

export function FormGrid({
  children,
  cols = 2,
  className,
}: {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const map = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  } as const;
  return <div className={cx("grid gap-3", map[cols], className)}>{children}</div>;
}

export function Avatar({ text, color }: { text: string; color?: string }) {
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
      style={{
        background: `color-mix(in oklab, ${color ?? "var(--primary)"} 18%, transparent)`,
        color: color ?? "var(--primary)",
      }}
    >
      {text}
    </span>
  );
}

export function Money({
  value,
  className,
  tone,
}: {
  value: string;
  className?: string;
  tone?: "due" | "paid" | "plain";
}) {
  const color =
    tone === "due" ? "text-[color:var(--destructive)]" : tone === "paid" ? "text-[color:var(--success)]" : "";
  return <span className={cx("num font-semibold", color, className)}>{value}</span>;
}

export function Progress({ value, tone = "primary" }: { value: number; tone?: Tone }) {
  const color =
    tone === "success"
      ? "var(--success)"
      : tone === "destructive"
        ? "var(--destructive)"
        : tone === "warning"
          ? "var(--warning)"
          : "var(--primary)";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--muted-foreground)_20%,transparent)]">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}
