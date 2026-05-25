"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Download, Trash2, Shield } from "lucide-react";

export default function SettingsPage() {
  const t = useTranslations();
  const { addToast } = useToast();

  async function handleExport() {
    try {
      const res = await fetch("/api/privacy/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `liggnett-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ title: t("common.success"), variant: "success" });
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!confirm(t("privacy.deleteWarning"))) return;

    try {
      await fetch("/api/privacy/delete", { method: "POST" });
      window.location.href = "/";
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{t("settings.title")}</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("privacy.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{t("privacy.exportData")}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Last ned alle dine data som JSON-fil
                </p>
              </div>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                {t("privacy.exportData")}
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-destructive p-4">
              <div>
                <p className="font-medium text-destructive">{t("privacy.deleteAccount")}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("privacy.deleteWarning")}
                </p>
              </div>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("privacy.deleteAccount")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
