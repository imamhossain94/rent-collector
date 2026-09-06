import { requireUser, getTheme, userLang } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { currentMonth, monthLabel } from "@/lib/format";
import type { Lang } from "@/lib/constants";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const lang = userLang(user);
  const theme = await getTheme();

  return (
    <AppShell
      user={{
        id: user.id,
        name: user.name,
        role: user.role,
        plan: user.plan,
        businessName: user.businessName,
      }}
      lang={lang}
      theme={theme}
      monthLabel={monthLabel(currentMonth(), lang)}
    >
      {children}
    </AppShell>
  );
}
