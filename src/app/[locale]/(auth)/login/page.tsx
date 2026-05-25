"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("auth.invalidCredentials"), variant: "destructive" });
        return;
      }

      addToast({ title: t("auth.loginSuccess"), variant: "success" });
      router.push("/dashboard");
      router.refresh();
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🔗 {t("auth.login")}</CardTitle>
          <CardDescription>{t("common.tagline")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("common.loading") : t("auth.login")}
            </Button>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("auth.noAccount")}{" "}
              <Link href="/register" className="text-[var(--primary)] hover:underline">
                {t("auth.register")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
