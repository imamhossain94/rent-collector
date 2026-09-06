import { requireUser } from "@/lib/auth";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="min-h-screen bg-background px-3 py-6 text-foreground sm:px-6">{children}</div>;
}
