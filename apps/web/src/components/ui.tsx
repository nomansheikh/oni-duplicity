import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "ghost" }) {
  const styles = {
    default: "border border-zinc-700 bg-zinc-800 hover:bg-zinc-700",
    primary: "bg-emerald-600 text-white hover:bg-emerald-500",
    ghost: "hover:bg-zinc-800",
  }[variant];
  return (
    <button
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm outline-none focus:border-emerald-500 ${className}`}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "zinc",
}: {
  children: ReactNode;
  tone?: "zinc" | "emerald" | "amber" | "sky";
}) {
  const styles = {
    zinc: "bg-zinc-800 text-zinc-300",
    emerald: "bg-emerald-900/60 text-emerald-300",
    amber: "bg-amber-900/60 text-amber-300",
    sky: "bg-sky-900/60 text-sky-300",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${styles}`}>
      {children}
    </span>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      {title && (
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

/** Text input that commits on blur or Enter instead of every keystroke. */
export function CommitInput({
  value,
  onCommit,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onCommit: (value: string) => void;
}) {
  return (
    <Input
      key={value}
      defaultValue={value}
      onBlur={(e) => e.currentTarget.value !== value && onCommit(e.currentTarget.value)}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      {...props}
    />
  );
}
