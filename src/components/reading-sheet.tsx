"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { SubmitButton } from "./client-bits";
import { money, num } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";

export type ReadingRow = {
  tenantId: string;
  tenantName: string;
  unitLabel: string;
  meterNumber: string | null;
  previous: number;
  current: number | null;
  rate: number;
  billed: boolean;
};

export function ReadingSheet({
  action,
  rows,
  billingMonth,
  lang,
}: {
  action: (fd: FormData) => Promise<void>;
  rows: ReadingRow[];
  billingMonth: string;
  lang: Lang;
}) {
  const [values, setValues] = useState<Record<string, { prev: number; cur: string; rate: number }>>(() =>
    Object.fromEntries(
      rows.map((r) => [r.tenantId, { prev: r.previous, cur: r.current != null ? String(r.current) : "", rate: r.rate }]),
    ),
  );

  const totals = rows.reduce(
    (acc, r) => {
      const v = values[r.tenantId];
      const cur = Number(v?.cur);
      if (!v || !v.cur || !Number.isFinite(cur)) return acc;
      const units = Math.max(0, cur - v.prev);
      acc.units += units;
      acc.amount += units * v.rate;
      acc.filled += 1;
      return acc;
    },
    { units: 0, amount: 0, filled: 0 },
  );

  const update = (id: string, patch: Partial<{ prev: number; cur: string; rate: number }>) =>
    setValues((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="billingMonth" value={billingMonth} />

      <div className="card" >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t("tenantName", lang)}</th>
                <th>{t("meterNo", lang)}</th>
                <th className="text-right">{t("previousReading", lang)}</th>
                <th className="text-right">{t("currentReading", lang)}</th>
                <th className="text-right">{t("rate", lang)}</th>
                <th className="text-right">{t("unitsUsed", lang)}</th>
                <th className="text-right">{t("amount", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const v = values[r.tenantId];
                const cur = Number(v?.cur);
                const hasValue = v?.cur !== "" && Number.isFinite(cur);
                const units = hasValue ? Math.max(0, cur - v.prev) : 0;
                const amount = units * (v?.rate ?? 0);
                const invalid = hasValue && cur < v.prev;
                return (
                  <tr key={r.tenantId}>
                    <td>
                      <span className="block font-bold">{r.tenantName}</span>
                      <span className="block text-2xs muted">{r.unitLabel}</span>
                    </td>
                    <td className="num muted">{r.meterNumber ?? "—"}</td>
                    <td className="text-right">
                      <input
                        name={`prev_${r.tenantId}`}
                        type="number"
                        step="0.01"
                        className="input h-8 w-24 text-right num"
                        value={v?.prev ?? 0}
                        onChange={(e) => update(r.tenantId, { prev: Number(e.target.value) })}
                      />
                    </td>
                    <td className="text-right">
                      <input
                        name={`cur_${r.tenantId}`}
                        type="number"
                        step="0.01"
                        placeholder="—"
                        className="input h-8 w-24 text-right num"
                        style={invalid ? { borderColor: "var(--destructive)" } : undefined}
                        value={v?.cur ?? ""}
                        onChange={(e) => update(r.tenantId, { cur: e.target.value })}
                      />
                    </td>
                    <td className="text-right">
                      <input
                        name={`rate_${r.tenantId}`}
                        type="number"
                        step="0.01"
                        className="input h-8 w-20 text-right num"
                        value={v?.rate ?? 0}
                        onChange={(e) => update(r.tenantId, { rate: Number(e.target.value) })}
                      />
                    </td>
                    <td className="num text-right font-bold">{hasValue ? num(units, lang) : "—"}</td>
                    <td className="num text-right font-bold" style={{ color: "var(--primary)" }}>
                      {hasValue ? money(amount, lang) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-pad flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-5 text-xs">
          <span className="flex items-center gap-1.5">
            <Zap className="size-4 text-[color:var(--warning)]" />
            <span className="muted">{pick(lang, "মোট ইউনিট", "Total units")}</span>
            <span className="num font-bold">{num(totals.units, lang)}</span>
          </span>
          <span>
            <span className="muted">{pick(lang, "মোট বিদ্যুৎ বিল", "Total electricity")} </span>
            <span className="num font-bold text-[color:var(--primary)]">{money(totals.amount, lang)}</span>
          </span>
          <span>
            <span className="muted">{pick(lang, "পূরণ হয়েছে", "Filled")} </span>
            <span className="num font-bold">
              {num(totals.filled, lang)}/{num(rows.length, lang)}
            </span>
          </span>
        </div>
        <SubmitButton className="btn btn-primary" pendingText={pick(lang, "সংরক্ষণ হচ্ছে…", "Saving…")}>
          {t("saveReadings", lang)}
        </SubmitButton>
      </div>
    </form>
  );
}
