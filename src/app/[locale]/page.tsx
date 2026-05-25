"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-2xl font-bold text-[var(--primary)]">
            🔗 {t("common.appName")}
          </h1>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">{t("auth.login")}</Button>
            </Link>
            <Link href="/register">
              <Button>{t("auth.register")}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="max-w-2xl text-center">
          <h2 className="mb-4 text-5xl font-extrabold tracking-tight">
            {t("common.appName")}
          </h2>
          <p className="mb-8 text-xl text-[var(--muted-foreground)]">
            {t("common.tagline")}
          </p>
          <p className="mb-12 text-lg text-[var(--muted-foreground)]">
            Kartlegg nettverket, visualiser forbindelser, og hold gruppen trygg med smittevarsling.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                {t("auth.register")} 🚀
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                {t("auth.login")}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-[var(--muted-foreground)]">
        <p>{t("footer.madeWith")}</p>
      </footer>
    </div>
  );
}
