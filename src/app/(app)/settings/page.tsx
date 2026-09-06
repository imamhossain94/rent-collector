import { Settings, Languages, Database, LogOut, ShieldCheck } from "lucide-react";
import { requireUser, getLang } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHead, StatCard } from "@/components/ui";
import { ProfileForm, PasswordForm } from "@/components/settings-forms";
import { SubmitButton } from "@/components/client-bits";
import { setLanguage } from "@/app/actions/preferences";
import { isSimulationMode } from "@/lib/sms";
import { num, formatDate } from "@/lib/format";
import { pick, t } from "@/lib/i18n";
import { label, PLANS, type Lang } from "@/lib/constants";

export default async function SettingsPage() {
  const user = await requireUser();
  const lang = await getLang((user.language as Lang) ?? "bn");

  const [properties, units, tenants, bills, payments, joined] = await Promise.all([
    prisma.property.count({ where: { ownerId: user.id } }),
    prisma.unit.count({ where: { property: { ownerId: user.id } } }),
    prisma.tenant.count({ where: { ownerId: user.id, status: "ACTIVE" } }),
    prisma.bill.count({ where: { ownerId: user.id } }),
    prisma.payment.count({ where: { ownerId: user.id } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { createdAt: true } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("settingsTitle", lang)}
        subtitle={pick(lang, "আপনার অ্যাকাউন্ট ও অ্যাপের পছন্দ", "Your account and app preferences")}
        icon={<Settings className="size-4" />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("navProperties", lang)} value={num(properties, lang)} />
        <StatCard label={t("units", lang)} value={num(units, lang)} />
        <StatCard label={t("tenants", lang)} value={num(tenants, lang)} tone="success" />
        <StatCard
          label={pick(lang, "বিল ও রসিদ", "Bills & receipts")}
          value={`${num(bills, lang)} / ${num(payments, lang)}`}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead
            title={t("profile", lang)}
            description={pick(
              lang,
              "এই তথ্যগুলোই বিল ও মানি রিসিটে ছাপা হবে",
              "These details are printed on every bill and receipt",
            )}
          />
          <ProfileForm lang={lang} user={user} />
        </Card>

        <div className="space-y-4">
          <Card id="password">
            <CardHead title={t("changePassword", lang)} />
            <PasswordForm lang={lang} />
          </Card>

          <Card>
            <CardHead title={t("language", lang)} />
            <div className="flex items-center gap-2">
              <form action={setLanguage.bind(null, "bn")}>
                <SubmitButton className={lang === "bn" ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}>
                  <Languages className="size-4" />
                  বাংলা
                </SubmitButton>
              </form>
              <form action={setLanguage.bind(null, "en")}>
                <SubmitButton className={lang === "en" ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}>
                  <Languages className="size-4" />
                  English
                </SubmitButton>
              </form>
            </div>
            <p className="mt-2 text-xs muted">
              {pick(
                lang,
                "বিল ও রসিদ সবসময় বাংলা ও ইংরেজি দুই ভাষাতেই ছাপা হয়।",
                "Bills and receipts always print bilingual, whichever you pick here.",
              )}
            </p>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title={pick(lang, "অ্যাকাউন্ট", "Account")} />
          <div className="space-y-2 text-xs">
            <Row label={pick(lang, "প্ল্যান", "Plan")} value={label(PLANS, user.plan, lang)} />
            <Row label={pick(lang, "ভূমিকা", "Role")} value={user.role === "SUPER_ADMIN" ? t("adminTitle", lang) : pick(lang, "বাড়িওয়ালা", "House owner")} />
            <Row label={pick(lang, "যোগ দিয়েছেন", "Joined")} value={formatDate(joined?.createdAt, lang)} />
            <Row
              label={pick(lang, "এসএমএস গেটওয়ে", "SMS gateway")}
              value={isSimulationMode() ? pick(lang, "ডেমো মোড", "Simulation") : pick(lang, "যুক্ত আছে", "Connected")}
            />
          </div>
          <form action="/api/logout" method="post" className="mt-4">
            <button className="btn btn-outline btn-sm text-[color:var(--destructive)]">
              <LogOut className="size-4" />
              {t("logout", lang)}
            </button>
          </form>
        </Card>

        <Card>
          <CardHead
            title={pick(lang, "ডেটা ও নিরাপত্তা", "Data & storage")}
            description={pick(lang, "আপনার হিসাব কোথায় থাকে", "Where your ledger lives")}
          />
          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5 rounded border border-border p-3">
              <span className="icon-box size-8 shrink-0">
                <Database className="size-4" />
              </span>
              <div>
                <p className="font-bold">SQLite</p>
                <p className="text-xs muted">
                  {pick(
                    lang,
                    "এখন সব তথ্য এই সার্ভারের একটি ফাইলে আছে। পরে PostgreSQL বা Firebase Firestore-এ সরানো যাবে — স্কিমা একই থাকবে।",
                    "Everything is in one file on this server for now. Moving to PostgreSQL or Firestore later needs no schema change.",
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded border border-border p-3">
              <span className="icon-box size-8 shrink-0">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <p className="font-bold">{pick(lang, "পাসওয়ার্ড সুরক্ষা", "Password safety")}</p>
                <p className="text-xs muted">
                  {pick(
                    lang,
                    "পাসওয়ার্ড bcrypt দিয়ে এনক্রিপ্ট করা থাকে, সেশন কুকি httpOnly।",
                    "Passwords are bcrypt-hashed and the session cookie is httpOnly.",
                  )}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label: rowLabel, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="muted">{rowLabel}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
