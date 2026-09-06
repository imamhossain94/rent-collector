import { Wallet, Plus } from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPropertyOptions } from "@/lib/queries";
import {
  PageHeader,
  Card,
  CardHead,
  TableWrap,
  EmptyState,
  StatCard,
  Money,
  Field,
  FormGrid,
  Input,
  Select,
  Textarea,
  Badge,
} from "@/components/ui";
import { FilterSelect, Modal, SubmitButton, ConfirmButton } from "@/components/client-bits";
import { addExpenseAction, deleteExpenseAction } from "@/app/actions/misc";
import { money, num, formatDate, currentMonth, lastMonths, monthLabel, monthRange, toDateInput } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { label, EXPENSE_CATEGORIES, type Lang } from "@/lib/constants";
import { sum } from "@/lib/utils";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; property?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const month = sp.month ?? currentMonth();
  const propertyId = sp.property ?? "";
  const category = sp.category ?? "";
  const { start, end } = monthRange(month);

  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");

  const [expenses, properties, collected] = await Promise.all([
    prisma.expense.findMany({
      where: {
        ownerId: user.id,
        spentAt: { gte: start, lte: end },
        ...(propertyId ? { propertyId } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { spentAt: "desc" },
      include: { property: { select: { id: true, name: true } } },
    }),
    getPropertyOptions(user.id),
    prisma.payment.aggregate({
      where: { ownerId: user.id, paidAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ]);

  const total = sum(expenses, (e) => e.amount);
  const income = collected._sum.amount ?? 0;

  const addForm = (
    <form action={addExpenseAction} className="space-y-4">
      <FormGrid>
        <Field label={pick(lang, "খরচের বিবরণ", "What was it for")} required className="sm:col-span-2">
          <Input name="title" required placeholder={pick(lang, "যেমন: ছাদের পানির ট্যাংক মেরামত", "e.g. Roof water tank repair")} />
        </Field>
        <Field label={t("amount", lang)} required>
          <Input name="amount" type="number" step="1" min={1} required />
        </Field>
        <Field label={t("date", lang)}>
          <Input name="spentAt" type="date" defaultValue={toDateInput(new Date())} />
        </Field>
        <Field label={t("category", lang)}>
          <Select name="category" defaultValue="REPAIR">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {lang === "bn" ? c.bn : c.en}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("navProperties", lang)}>
          <Select name="propertyId" defaultValue={propertyId}>
            <option value="">{pick(lang, "সাধারণ খরচ", "General / all")}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("vendor", lang)} className="sm:col-span-2">
          <Input name="vendor" placeholder={pick(lang, "যেমন: মিস্ত্রি করিম", "e.g. Karim (plumber)")} />
        </Field>
        <Field label={t("note", lang)} className="sm:col-span-2">
          <Textarea name="note" rows={2} />
        </Field>
      </FormGrid>
      <SubmitButton className="btn btn-primary w-full">{t("addExpense", lang)}</SubmitButton>
    </form>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("expenseTitle", lang)}
        subtitle={t("expenseSubtitle", lang)}
        icon={<Wallet className="size-4" />}
        actions={
          <Modal
            title={t("addExpense", lang)}
            description={pick(lang, "মেরামত, বেতন, কর ইত্যাদি", "Repairs, salaries, taxes and more")}
            trigger={
              <button className="btn btn-primary btn-sm">
                <Plus className="size-4" />
                {t("addExpense", lang)}
              </button>
            }
          >
            {addForm}
          </Modal>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("expenses", lang)} value={money(total, lang)} tone="warning" hint={monthLabel(month, lang)} />
        <StatCard label={t("collected", lang)} value={money(income, lang)} tone="success" />
        <StatCard
          label={t("netIncome", lang)}
          value={money(income - total, lang)}
          tone={income - total >= 0 ? "primary" : "destructive"}
        />
        <StatCard
          label={pick(lang, "খরচের হার", "Expense ratio")}
          value={`${num(income ? Math.round((total / income) * 100) : 0, lang)}%`}
          hint={pick(lang, "আদায়ের তুলনায়", "of what you collected")}
        />
      </div>

      <Card pad={false}>
        <div className="card-pad flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardHead title={monthLabel(month, lang)} className="mb-0" />
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              paramName="month"
              value={month}
              options={lastMonths(12).reverse().map((m) => ({ value: m, label: monthLabel(m, lang) }))}
            />
            <FilterSelect
              paramName="category"
              value={category}
              options={[
                { value: "", label: t("all", lang) },
                ...EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: lang === "bn" ? c.bn : c.en })),
              ]}
            />
            <FilterSelect
              paramName="property"
              value={propertyId}
              options={[
                { value: "", label: pick(lang, "সব সম্পত্তি", "All properties") },
                ...properties.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
        </div>

        {expenses.length === 0 ? (
          <EmptyState
            icon={<Wallet className="size-5" />}
            title={pick(lang, "এই মাসে কোনো খরচ লেখা হয়নি", "No expenses recorded this month")}
            description={pick(
              lang,
              "খরচ লিখে রাখলে নীট আয় সঠিকভাবে বোঝা যায়।",
              "Recording costs is what makes the net income figure honest.",
            )}
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>{t("date", lang)}</th>
                <th>{pick(lang, "বিবরণ", "Description")}</th>
                <th>{t("category", lang)}</th>
                <th>{t("navProperties", lang)}</th>
                <th>{t("vendor", lang)}</th>
                <th className="text-right">{t("amount", lang)}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="muted whitespace-nowrap">{formatDate(e.spentAt, lang)}</td>
                  <td className="font-semibold">
                    {e.title}
                    {e.note ? <span className="block text-2xs muted">{e.note}</span> : null}
                  </td>
                  <td>
                    <Badge tone="muted">{label(EXPENSE_CATEGORIES, e.category, lang)}</Badge>
                  </td>
                  <td className="muted">{e.property?.name ?? pick(lang, "সাধারণ", "General")}</td>
                  <td className="muted">{e.vendor ?? "—"}</td>
                  <td className="text-right">
                    <Money value={money(e.amount, lang)} />
                  </td>
                  <td className="text-right">
                    <form action={deleteExpenseAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <ConfirmButton message={t("confirmDelete", lang)}>✕</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
