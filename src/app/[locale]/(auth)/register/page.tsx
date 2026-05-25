"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          displayName: formData.get("displayName") || undefined,
          ageConfirmed,
          locale: params.locale || "nb",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const errorMsg = data.details?.fieldErrors
          ? Object.values(data.details.fieldErrors).flat().join(", ")
          : data.error;
        addToast({ title: errorMsg || t("common.error"), variant: "destructive" });
        return;
      }

      addToast({ title: t("auth.registerSuccess"), variant: "success" });
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
          <CardTitle className="text-2xl">🔗 {t("auth.register")}</CardTitle>
          <CardDescription>{t("common.tagline")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">{t("auth.displayName")}</Label>
              <Input id="displayName" name="displayName" autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" name="password" type="password" required autoComplete="new-password" />
              <p className="text-xs text-[var(--muted-foreground)]">{t("auth.passwordRequirements")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ageConfirmed"
                checked={ageConfirmed}
                onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
              />
              <Label htmlFor="ageConfirmed" className="text-sm font-normal">
                {t("auth.ageConfirmation")}
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading || !ageConfirmed}>
              {loading ? t("common.loading") : t("auth.register")}
            </Button>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("auth.hasAccount")}{" "}
              <Link href="/login" className="text-[var(--primary)] hover:underline">
                {t("auth.login")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
