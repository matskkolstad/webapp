"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Plus, UserCircle } from "lucide-react";

interface Person {
  id: string;
  alias: string;
  contactToken: string | null;
  userId: string | null;
  createdAt: string;
}

export default function MembersPage() {
  const t = useTranslations();
  const params = useParams();
  const groupId = params.groupId as string;
  const { addToast } = useToast();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/persons`)
      .then((r) => r.json())
      .then((d) => {
        setPersons(d.persons || []);
        setLoading(false);
      });
  }, [groupId]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/groups/${groupId}/persons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: formData.get("alias"),
          contactToken: formData.get("contactToken") || undefined,
        }),
      });

      if (!res.ok) {
        addToast({ title: t("common.error"), variant: "destructive" });
        return;
      }

      addToast({ title: t("common.success"), variant: "success" });
      setDialogOpen(false);
      const data = await fetch(`/api/groups/${groupId}/persons`).then((r) => r.json());
      setPersons(data.persons || []);
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  if (loading) return <div className="py-12 text-center">{t("common.loading")}</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("persons.title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("persons.add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("persons.add")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alias">{t("persons.alias")}</Label>
                <Input id="alias" name="alias" required maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactToken">{t("persons.contactToken")}</Label>
                <Input id="contactToken" name="contactToken" maxLength={200} />
              </div>
              <Button type="submit" className="w-full">{t("persons.add")}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {persons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCircle className="mx-auto mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
            <p className="text-[var(--muted-foreground)]">{t("persons.emptyState")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {persons.map((person) => (
            <Card key={person.id}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]">
                  {person.alias[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{person.alias}</p>
                  {person.userId && (
                    <Badge variant="outline" className="text-xs">{t("persons.linkToMe")}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
