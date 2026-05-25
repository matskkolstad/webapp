"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { AlertTriangle, Plus, Shield } from "lucide-react";

interface Person {
  id: string;
  alias: string;
}

export default function AlertsPage() {
  const t = useTranslations();
  const params = useParams();
  const groupId = params.groupId as string;
  const { addToast } = useToast();
  const [persons, setPersons] = useState<Person[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/persons`)
      .then((r) => r.json())
      .then((d) => setPersons(d.persons || []));
  }, [groupId]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personAliasId: selectedPerson,
          isAnonymous,
          message: formData.get("message") || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }

      const data = await res.json();
      addToast({
        title: t("alerts.warning"),
        description: `${data.notifiedCount} person(er) varslet`,
        variant: "success",
      });
      setDialogOpen(false);
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
          {t("alerts.title")}
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Plus className="mr-2 h-4 w-4" />
              {t("alerts.create")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("alerts.create")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                <p className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Dette varselet sendes til alle som har relasjon med den valgte personen.
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t("alerts.selectPerson")}</Label>
                <Select onValueChange={setSelectedPerson}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("alerts.selectPerson")} />
                  </SelectTrigger>
                  <SelectContent>
                    {persons.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.alias}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(c) => setIsAnonymous(c === true)}
                />
                <Label htmlFor="anonymous">{t("alerts.anonymous")}</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">{t("alerts.message")}</Label>
                <Input id="message" name="message" maxLength={1000} />
              </div>
              <Button type="submit" variant="destructive" className="w-full" disabled={!selectedPerson}>
                {t("alerts.create")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-green-300" />
          <p className="text-[var(--muted-foreground)]">{t("alerts.emptyState")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
