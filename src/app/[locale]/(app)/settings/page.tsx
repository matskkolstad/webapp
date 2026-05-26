"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Download, Trash2, Shield } from "lucide-react";

interface LinkedGroup {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const t = useTranslations();
  const { addToast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [linkedGroups, setLinkedGroups] = useState<LinkedGroup[]>([]);
  const [removeLinkedPersons, setRemoveLinkedPersons] = useState(false);
  const [removeAllGroups, setRemoveAllGroups] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadDeleteOptions() {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/privacy/delete-options");
      const data = await res.json();
      setLinkedGroups(data.groups || []);
      const defaults: Record<string, boolean> = {};
      (data.groups || []).forEach((g: LinkedGroup) => {
        defaults[g.id] = false;
      });
      setSelectedGroups(defaults);
    } finally {
      setDeleteLoading(false);
    }
  }

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
    setDeleteError(null);

    if (removeLinkedPersons && !removeAllGroups) {
      const anySelected = Object.values(selectedGroups).some(Boolean);
      if (!anySelected) {
        setDeleteError(t("privacy.deleteSelectGroups"));
        return;
      }
    }

    const groupIds = Object.entries(selectedGroups)
      .filter(([, checked]) => checked)
      .map(([id]) => id);

    try {
      await fetch("/api/privacy/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          removeLinkedPersons,
          removeAllGroups,
          groupIds,
        }),
      });
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
              <Dialog
                open={deleteOpen}
                onOpenChange={(open) => {
                  setDeleteOpen(open);
                  if (open) {
                    loadDeleteOptions();
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("privacy.deleteAccount")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("privacy.deleteAccount")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("privacy.deleteWarning")}
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="remove-linked"
                          checked={removeLinkedPersons}
                          onCheckedChange={(v) => {
                            setRemoveLinkedPersons(v === true);
                            setDeleteError(null);
                          }}
                        />
                        <Label htmlFor="remove-linked">{t("privacy.deleteLinkedPersons")}</Label>
                      </div>

                      {removeLinkedPersons && (
                        <div className="space-y-3 rounded-md border p-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="remove-all"
                              checked={removeAllGroups}
                              onCheckedChange={(v) => {
                                setRemoveAllGroups(v === true);
                                setDeleteError(null);
                              }}
                            />
                            <Label htmlFor="remove-all">{t("privacy.deleteAllGroups")}</Label>
                          </div>

                          {!removeAllGroups && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{t("privacy.deleteSelectGroups")}</p>
                              {deleteLoading ? (
                                <p className="text-sm text-[var(--muted-foreground)]">{t("common.loading")}</p>
                              ) : linkedGroups.length === 0 ? (
                                <p className="text-sm text-[var(--muted-foreground)]">{t("privacy.noLinkedGroups")}</p>
                              ) : (
                                <div className="space-y-2">
                                  {linkedGroups.map((group) => (
                                    <div key={group.id} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`group-${group.id}`}
                                        checked={!!selectedGroups[group.id]}
                                        onCheckedChange={(v) => {
                                          setSelectedGroups((prev) => ({
                                            ...prev,
                                            [group.id]: v === true,
                                          }));
                                          setDeleteError(null);
                                        }}
                                      />
                                      <Label htmlFor={`group-${group.id}`}>{group.name}</Label>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {deleteError && (
                      <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                        {deleteError}
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                        {t("common.cancel")}
                      </Button>
                      <Button variant="destructive" onClick={handleDelete}>
                        {t("privacy.deleteAccount")}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
