"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, X } from "lucide-react";
import { cx } from "@/lib/utils";

/** Submit button that shows a spinner while the server action runs. */
export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingText,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} type="submit" className={className} disabled={pending || rest.disabled}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

/** Submit button guarded by a confirm() — used for destructive actions. */
export function ConfirmButton({
  children,
  message,
  className = "btn btn-ghost btn-sm text-[color:var(--destructive)]",
  ...rest
}: {
  children: ReactNode;
  message: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      className={className}
      disabled={pending || rest.disabled}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}

/** Lightweight modal — opened by its own trigger button, closes on Esc/backdrop. */
export function Modal({
  trigger,
  title,
  description,
  children,
  wide,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          // A server action inside the modal keeps running after the dialog
          // unmounts, so close once the submit is on its way — otherwise the
          // form sits there looking like nothing happened while the row is
          // already being written.
          onSubmitCapture={() => window.setTimeout(close, 450)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={close} />
          <div
            className={cx(
              "card relative z-10 max-h-[92vh] w-full overflow-y-auto",
              wide ? "sm:max-w-3xl" : "sm:max-w-lg",
            )}
          >
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-border bg-card px-4 py-3">
              <div>
                <h3 className="card-title">{title}</h3>
                {description ? <p className="card-description mt-0.5">{description}</p> : null}
              </div>
              <button className="btn btn-ghost btn-icon-sm" onClick={close} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="px-4 py-4">
              {typeof children === "function" ? children(close) : children}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Dropdown used by the top bar (user menu, language). */
export function Dropdown({
  trigger,
  children,
  align = "right",
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <span onClick={() => setOpen((v) => !v)} className="contents">
        {trigger}
      </span>
      {open ? (
        <div
          className={cx(
            "absolute z-50 mt-2 min-w-52 rounded border border-border bg-card p-1.5 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
          // Close on the next tick, not during the click: unmounting the menu
          // synchronously cancels the default action of whatever was clicked,
          // which is how the sign-out form silently never submitted.
          onClick={() => window.setTimeout(() => setOpen(false), 0)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Debounced search box that writes ?q= into the URL. */
export function SearchBox({
  placeholder,
  paramName = "q",
  defaultValue = "",
}: {
  placeholder: string;
  paramName?: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    const id = setTimeout(() => {
      const url = new URL(window.location.href);
      if (value) url.searchParams.set(paramName, value);
      else url.searchParams.delete(paramName);
      if (url.toString() !== window.location.href) window.location.replace(url.toString());
    }, 400);
    return () => clearTimeout(id);
  }, [value, paramName]);

  return (
    <input
      className="input h-9 sm:w-64"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

/** Any <select>/<input> that reloads the page with a query param when changed. */
export function FilterSelect({
  paramName,
  value,
  options,
  className,
}: {
  paramName: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      className={cx("select h-9 w-auto", className)}
      value={value}
      onChange={(e) => {
        const url = new URL(window.location.href);
        if (e.target.value) url.searchParams.set(paramName, e.target.value);
        else url.searchParams.delete(paramName);
        window.location.assign(url.toString());
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function PrintButton({ label }: { label: string }) {
  return (
    <button className="btn btn-primary btn-sm no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn-outline btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked — nothing to do */
        }
      }}
    >
      {done ? "✓" : label}
    </button>
  );
}
