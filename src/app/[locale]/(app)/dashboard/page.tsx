"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Plus, Users, Network, ArrowRight } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  role: string;
  memberCount: number;
  relationshipCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const t = useTranslations();
  const { addToast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await fetch("/api/groups");
        const data = await res.json();
        setGroups(data.groups || []);
      } catch {
        addToast({ title: t("common.error"), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    loadGroups();
  }, [addToast, t]);

  async function fetchGroups() {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description") || undefined,
        }),
      });

      if (!res.ok) {
        addToast({ title: t("common.error"), variant: "destructive" });
        return;
      }

      addToast({ title: t("common.success"), variant: "success" });
      setCreateOpen(false);
      fetchGroups();
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleJoinGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: formData.get("code") }),
      });

      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }

      addToast({ title: t("common.success"), variant: "success" });
      setJoinOpen(false);
      fetchGroups();
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  if (loading) {
    return <div className="py-12 text-center">{t("common.loading")}</div>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">{t("groups.title")}</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">{t("groups.join")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("groups.join")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleJoinGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">{t("groups.inviteCode")}</Label>
                  <Input id="code" name="code" placeholder="ABCD1234" required />
                </div>
                <Button type="submit" className="w-full">{t("groups.join")}</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                {t("groups.create")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("groups.create")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("groups.name")}</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t("groups.description")}</Label>
                  <Input id="description" name="description" />
                </div>
                <Button type="submit" className="w-full">{t("groups.create")}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
            <p className="text-[var(--muted-foreground)]">{t("groups.emptyState")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{group.name}</CardTitle>
                    <Badge variant="secondary">{t(`groups.roles.${group.role}`)}</Badge>
                  </div>
                  {group.description && (
                    <CardDescription>{group.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-[var(--muted-foreground)]">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" /> {group.memberCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Network className="h-4 w-4" /> {group.relationshipCount}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
