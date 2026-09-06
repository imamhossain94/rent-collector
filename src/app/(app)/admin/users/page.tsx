import { Users, Plus, KeyRound, Power } from "lucide-react";
import { requireSuperAdmin, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  PageHeader,
  Card,
  CardHead,
  TableWrap,
  EmptyState,
  Badge,
  StatCard,
  Field,
  FormGrid,
  Input,
  Select,
  Avatar,
} from "@/components/ui";
import { Modal, SubmitButton, ConfirmButton, SearchBox, FilterSelect } from "@/components/client-bits";
import {
  toggleUserStatusAction,
  setUserPlanAction,
  resetUserPasswordAction,
  createUserAction,
  deleteUserAction,
} from "@/app/actions/admin";
import { num, formatDate, initials } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { label, tone, USER_STATUS, PLANS, ROLES, type Lang } from "@/lib/constants";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; role?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const status = sp.status ?? "";
  const role = sp.role ?? "";

  const admin = await requireSuperAdmin();
  const lang = await getLang((admin.language as Lang) ?? "bn");

  const users = await prisma.user.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(role ? { role } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { businessName: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      businessName: true,
      role: true,
      status: true,
      plan: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { properties: true, tenants: true, payments: true } },
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("navUsers", lang)}
        subtitle={pick(lang, "সব ব্যবহারকারী দেখুন, স্থগিত করুন বা প্ল্যান বদলান", "See, suspend or upgrade every user")}
        icon={<Users className="size-4" />}
        actions={
          <Modal
            title={pick(lang, "নতুন ব্যবহারকারী", "New user")}
            description={pick(lang, "অ্যাডমিন হিসেবে অ্যাকাউন্ট তৈরি করুন", "Create an account on someone's behalf")}
            trigger={
              <button className="btn btn-primary btn-sm">
                <Plus className="size-4" />
                {pick(lang, "নতুন ব্যবহারকারী", "New user")}
              </button>
            }
          >
            <form action={createUserAction} className="space-y-4">
              <FormGrid>
                <Field label={t("name", lang)} required>
                  <Input name="name" required />
                </Field>
                <Field label={t("phone", lang)} required>
                  <Input name="phone" required inputMode="numeric" placeholder="01712345678" />
                </Field>
                <Field label={t("businessName", lang)}>
                  <Input name="businessName" />
                </Field>
                <Field label={t("email", lang)}>
                  <Input name="email" type="email" />
                </Field>
                <Field label={pick(lang, "ভূমিকা", "Role")}>
                  <Select name="role" defaultValue="OWNER">
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {lang === "bn" ? r.bn : r.en}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={pick(lang, "প্ল্যান", "Plan")}>
                  <Select name="plan" defaultValue="FREE">
                    {PLANS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {lang === "bn" ? p.bn : p.en}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("password", lang)} required className="sm:col-span-2">
                  <Input name="password" type="password" required minLength={6} />
                </Field>
              </FormGrid>
              <SubmitButton className="btn btn-primary w-full">{t("create", lang)}</SubmitButton>
            </form>
          </Modal>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={pick(lang, "মোট ব্যবহারকারী", "Total users")} value={num(users.length, lang)} />
        <StatCard
          label={pick(lang, "সক্রিয়", "Active")}
          value={num(users.filter((u) => u.status === "ACTIVE").length, lang)}
          tone="success"
        />
        <StatCard
          label={pick(lang, "স্থগিত", "Suspended")}
          value={num(users.filter((u) => u.status === "SUSPENDED").length, lang)}
          tone="destructive"
        />
        <StatCard label="PRO" value={num(users.filter((u) => u.plan === "PRO").length, lang)} tone="primary" />
      </div>

      <Card pad={false}>
        <div className="card-pad flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardHead title={pick(lang, "ব্যবহারকারী তালিকা", "All users")} className="mb-0" />
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox placeholder={pick(lang, "নাম বা মোবাইল", "Name or phone")} defaultValue={q} />
            <FilterSelect
              paramName="status"
              value={status}
              options={[
                { value: "", label: t("all", lang) },
                ...USER_STATUS.map((s) => ({ value: s.value, label: lang === "bn" ? s.bn : s.en })),
              ]}
            />
            <FilterSelect
              paramName="role"
              value={role}
              options={[
                { value: "", label: t("all", lang) },
                ...ROLES.map((r) => ({ value: r.value, label: lang === "bn" ? r.bn : r.en })),
              ]}
            />
          </div>
        </div>

        {users.length === 0 ? (
          <EmptyState title={pick(lang, "কেউ পাওয়া যায়নি", "No users found")} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>{t("name", lang)}</th>
                <th>{pick(lang, "ভূমিকা", "Role")}</th>
                <th>{pick(lang, "সম্পত্তি/ভাড়াটিয়া/রসিদ", "Props / tenants / receipts")}</th>
                <th>{pick(lang, "যোগ", "Joined")}</th>
                <th>{pick(lang, "শেষ লগইন", "Last login")}</th>
                <th>{t("status", lang)}</th>
                <th className="text-right">{t("actions", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar text={initials(u.name)} color={u.role === "SUPER_ADMIN" ? "var(--destructive)" : undefined} />
                      <span>
                        <span className="block font-bold">{u.businessName || u.name}</span>
                        <span className="num block text-2xs muted">{u.phone}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <Badge tone={u.role === "SUPER_ADMIN" ? "destructive" : "primary"}>
                      {label(ROLES, u.role, lang)}
                    </Badge>
                  </td>
                  <td className="num muted">
                    {num(u._count.properties, lang)} / {num(u._count.tenants, lang)} / {num(u._count.payments, lang)}
                  </td>
                  <td className="muted whitespace-nowrap">{formatDate(u.createdAt, lang)}</td>
                  <td className="muted whitespace-nowrap">{u.lastLoginAt ? formatDate(u.lastLoginAt, lang) : "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={tone(USER_STATUS, u.status)}>{label(USER_STATUS, u.status, lang)}</Badge>
                      <Badge tone={u.plan === "PRO" ? "primary" : "muted"}>{label(PLANS, u.plan, lang)}</Badge>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <form action={setUserPlanAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="plan" value={u.plan === "PRO" ? "FREE" : "PRO"} />
                        <SubmitButton className="btn btn-ghost btn-sm" title={pick(lang, "প্ল্যান বদল", "Toggle plan")}>
                          {u.plan === "PRO" ? "↓ FREE" : "↑ PRO"}
                        </SubmitButton>
                      </form>

                      <Modal
                        title={t("resetPassword", lang)}
                        description={u.name}
                        trigger={
                          <button className="btn btn-ghost btn-icon-sm" title={t("resetPassword", lang)}>
                            <KeyRound className="size-4" />
                          </button>
                        }
                      >
                        <form action={resetUserPasswordAction} className="space-y-3">
                          <input type="hidden" name="id" value={u.id} />
                          <Field label={t("newPassword", lang)} required>
                            <Input name="password" type="password" required minLength={6} />
                          </Field>
                          <SubmitButton className="btn btn-primary w-full">{t("resetPassword", lang)}</SubmitButton>
                        </form>
                      </Modal>

                      {u.id !== admin.id ? (
                        <>
                          <form action={toggleUserStatusAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <SubmitButton
                              className="btn btn-ghost btn-icon-sm"
                              title={u.status === "ACTIVE" ? t("suspend", lang) : t("activate", lang)}
                            >
                              <Power
                                className="size-4"
                                style={{ color: u.status === "ACTIVE" ? "var(--destructive)" : "var(--success)" }}
                              />
                            </SubmitButton>
                          </form>
                          <form action={deleteUserAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <ConfirmButton
                              message={pick(
                                lang,
                                "এই ব্যবহারকারীর সব সম্পত্তি, ভাড়াটিয়া ও হিসাব মুছে যাবে। নিশ্চিত?",
                                "This deletes their properties, tenants and entire ledger. Sure?",
                              )}
                            >
                              ✕
                            </ConfirmButton>
                          </form>
                        </>
                      ) : (
                        <Badge tone="muted">{pick(lang, "আপনি", "you")}</Badge>
                      )}
                    </div>
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
