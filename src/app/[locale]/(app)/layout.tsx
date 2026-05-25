import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { redirect } from "@/i18n/navigation";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  return <AppShell user={user}>{children}</AppShell>;
}
