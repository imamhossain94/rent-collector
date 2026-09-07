"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  ReceiptText,
  HandCoins,
  Gauge,
  Wallet,
  BarChart3,
  MessageSquare,
  Settings,
  ShieldCheck,
  Menu,
  X,
  Moon,
  Sun,
  Languages,
  LogOut,
  ChevronDown,
  KeyRound,
  ScrollText,
  Plus,
} from "lucide-react";
import { cx } from "@/lib/utils";
import { t, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/constants";
import { Dropdown, SubmitButton } from "./client-bits";
import { setLanguage, setTheme } from "@/app/actions/preferences";
import { logoutAction } from "@/app/actions/auth";
import { initials } from "@/lib/format";

type NavItem = { href: string; icon: ReactNode; label: string; exact?: boolean };

export function AppShell({
  children,
  user,
  lang,
  theme,
  monthLabel,
}: {
  children: ReactNode;
  user: { id: string; name: string; role: string; plan: string; businessName: string | null };
  lang: Lang;
  theme: "dark" | "light";
  monthLabel: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(theme === "dark");
  const isAdmin = user.role === "SUPER_ADMIN";

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: t("groupManage", lang),
      items: [
        { href: "/dashboard", icon: <LayoutDashboard className="size-4 shrink-0" />, label: t("navOverview", lang), exact: true },
        { href: "/properties", icon: <Building2 className="size-4 shrink-0" />, label: t("navProperties", lang) },
        { href: "/tenants", icon: <Users className="size-4 shrink-0" />, label: t("navTenants", lang) },
      ],
    },
    {
      title: t("groupMoney", lang),
      items: [
        { href: "/bills", icon: <ReceiptText className="size-4 shrink-0" />, label: t("navBills", lang) },
        { href: "/payments", icon: <HandCoins className="size-4 shrink-0" />, label: t("navPayments", lang) },
        { href: "/utilities", icon: <Gauge className="size-4 shrink-0" />, label: t("navUtilities", lang) },
        { href: "/expenses", icon: <Wallet className="size-4 shrink-0" />, label: t("navExpenses", lang) },
      ],
    },
    {
      title: t("groupMore", lang),
      items: [
        { href: "/reports", icon: <BarChart3 className="size-4 shrink-0" />, label: t("navReports", lang) },
        { href: "/sms", icon: <MessageSquare className="size-4 shrink-0" />, label: t("navSms", lang) },
        { href: "/settings", icon: <Settings className="size-4 shrink-0" />, label: t("navSettings", lang) },
      ],
    },
  ];

  if (isAdmin) {
    groups.push({
      title: t("navAdmin", lang),
      items: [
        { href: "/admin", icon: <ShieldCheck className="size-4 shrink-0" />, label: t("adminTitle", lang), exact: true },
        { href: "/admin/users", icon: <Users className="size-4 shrink-0" />, label: t("navUsers", lang) },
        { href: "/admin/audit", icon: <ScrollText className="size-4 shrink-0" />, label: t("navAudit", lang) },
      ],
    });
  }

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    void setTheme(next ? "dark" : "light");
  };

  const nav = (
    <div className="flex h-full flex-col justify-between gap-4 p-3">
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 rounded border border-border/80 bg-[color-mix(in_oklab,var(--muted)_35%,transparent)] p-2.5">
          <div className="icon-box-primary size-7 shrink-0">
            <Building2 className="size-4" />
          </div>
          <div className="overflow-hidden">
            <span className="block text-2xs font-semibold uppercase leading-tight muted">
              {pick(lang, "চলতি মাস", "Current month")}
            </span>
            <span className="block truncate text-xs font-bold">{monthLabel}</span>
          </div>
        </div>

        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="nav-section">{group.title}</p>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cx("nav-link", isActive(item) && "nav-link-active")}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="rounded border border-border/80 bg-[color-mix(in_oklab,var(--primary)_8%,transparent)] p-3">
        <p className="text-xs font-bold text-[color:var(--primary)]">
          {pick(lang, "মাসিক বিল তৈরি", "Generate this month")}
        </p>
        <p className="mt-0.5 text-2xs leading-snug muted">
          {pick(
            lang,
            "এক ক্লিকে সব ভাড়াটিয়ার বিল তৈরি হবে।",
            "One click bills every active tenant.",
          )}
        </p>
        <Link href="/bills/generate" className="btn btn-primary btn-sm mt-2 w-full" onClick={() => setMobileOpen(false)}>
          <Plus className="size-4" />
          {t("generateBills", lang)}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* top bar */}
      <header className="z-40 h-16 shrink-0 border-b border-border bg-background/90 backdrop-blur-md no-print">
        <div className="flex h-full items-center justify-between gap-2 px-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <button
              className="btn btn-ghost btn-icon-sm lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="icon-box-primary size-9">
                <Building2 className="size-5" />
              </div>
              <span className="hidden text-lg font-bold tracking-tight sm:inline">
                {pick(lang, "ভাড়া", "Bhara")}
                <span className="text-[color:var(--primary)]">{pick(lang, "খাতা", "Khata")}</span>
              </span>
            </Link>
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
            <span className="chip hidden sm:inline-flex">
              <span className="truncate max-w-40">{user.businessName || user.name}</span>
              {user.plan === "PRO" ? <span className="badge badge-primary ml-1">PRO</span> : null}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <form action={setLanguage.bind(null, lang === "bn" ? "en" : "bn")}>
              {/* switching writes the account preference and revalidates the
                  tree, which is a database round trip — show it is working */}
              <SubmitButton className="btn btn-ghost btn-sm gap-1.5" title="Language">
                <Languages className="size-4" />
                <span className="text-xs font-bold">{lang === "bn" ? "EN" : "বাং"}</span>
              </SubmitButton>
            </form>

            <button className="btn btn-ghost btn-icon-sm" onClick={toggleTheme} aria-label="Theme">
              {isDark ? <Moon className="size-4 text-sky-500" /> : <Sun className="size-4 text-amber-500" />}
            </button>

            <Dropdown
              trigger={
                <button className="chip cursor-pointer">
                  <span className="flex size-6 items-center justify-center rounded-full bg-[color:var(--primary)] text-2xs font-bold text-[color:var(--primary-foreground)]">
                    {initials(user.name)}
                  </span>
                  <span className="hidden max-w-28 truncate md:inline">{user.name}</span>
                  <ChevronDown className="size-3 muted" />
                </button>
              }
            >
              <div className="px-2.5 py-2">
                <p className="text-xs font-bold">{user.name}</p>
                <p className="text-2xs muted">
                  {user.role === "SUPER_ADMIN" ? t("adminTitle", lang) : t("navSettings", lang)}
                </p>
              </div>
              <div className="divider my-1" />
              <Link href="/settings" className="nav-link">
                <Settings className="size-4" />
                {t("settingsTitle", lang)}
              </Link>
              <Link href="/settings#password" className="nav-link">
                <KeyRound className="size-4" />
                {t("changePassword", lang)}
              </Link>
              {user.role === "SUPER_ADMIN" ? (
                <Link href="/admin" className="nav-link">
                  <ShieldCheck className="size-4" />
                  {t("adminTitle", lang)}
                </Link>
              ) : null}
              <div className="divider my-1" />
              <form action={logoutAction}>
                <button className="nav-link w-full text-left text-[color:var(--destructive)]">
                  <LogOut className="size-4" />
                  {t("logout", lang)}
                </button>
              </form>
            </Dropdown>
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {/* desktop sidebar */}
        <aside className="hidden w-68 shrink-0 flex-col overflow-y-auto border-r border-border bg-[color-mix(in_oklab,var(--card)_60%,transparent)] lg:flex no-print">
          {nav}
        </aside>

        {/* mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 top-16 z-30 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <aside className="relative h-full w-72 overflow-y-auto border-r border-border bg-card">{nav}</aside>
          </div>
        ) : null}

        <main className="flex-1 overflow-y-auto">
          <div className="w-full p-4 sm:p-6 lg:p-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
