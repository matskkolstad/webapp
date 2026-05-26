"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { AlertTriangle, ArrowLeft, Plus, Shield } from "lucide-react";

interface Person {
  id: string;
  alias: string;
  userId: string | null;
}

interface AlertRecipient {
  id: string;
  label: string;
}

interface ExposureAlert {
  id: string;
  createdById: string;
  createdBy: { id: string; displayName: string | null; email: string } | null;
  personAliasId: string;
  personAlias: { id: string; alias: string };
  isAnonymous: boolean;
  notifyAll: boolean;
  message: string | null;
  createdAt: string;
  recipients: AlertRecipient[];
  recipientsHidden: boolean;
}

interface Member {
  userId: string;
  role: string;
  user: { id: string; displayName: string | null; email: string };
}

export default function AlertsPage() {
  const t = useTranslations();
  const params = useParams();
  const groupId = params.groupId as string;
  const router = useRouter();
  const { addToast } = useToast();
  const [persons, setPersons] = useState<Person[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [alerts, setAlerts] = useState<ExposureAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [notifyAll, setNotifyAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [meRes, groupRes, personsRes, membersRes, alertsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/groups/${groupId}/persons`),
        fetch(`/api/groups/${groupId}/members`),
        fetch(`/api/groups/${groupId}/alerts`),
      ]);

      if (!meRes.ok || !groupRes.ok || !personsRes.ok || !membersRes.ok || !alertsRes.ok) return;

      const meData = await meRes.json();
      const groupData = await groupRes.json();
      const personsData = await personsRes.json();
      const membersData = await membersRes.json();
      const alertsData = await alertsRes.json();

      if (cancelled) return;

      const admin = ["admin", "owner"].includes(groupData?.group?.currentUserRole);
      setIsAdmin(admin);
      setCurrentUserId(meData?.user?.id || null);
      setPersons(personsData?.persons || []);
      setMembers(membersData?.members || []);
      setAlerts(alertsData?.alerts || []);
      setLoadingAlerts(false);

      const ownAlias = (personsData?.persons || []).find(
        (p: Person) => p.userId && p.userId === meData?.user?.id
      );

      if (admin) {
        setSelectedMemberId(meData?.user?.id || "");
        setSelectedPerson(ownAlias?.id || "");
      } else {
        setSelectedPerson(ownAlias?.id || "");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  function handleMemberChange(memberId: string) {
    setSelectedMemberId(memberId);
    const alias = persons.find((p) => p.userId === memberId);
    setSelectedPerson(alias?.id || "");
  }

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
          notifyAll: isAdmin ? notifyAll : false,
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
      const alertsRes = await fetch(`/api/groups/${groupId}/alerts`);
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData?.alerts || []);
      }
      setDialogOpen(false);
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            {t("alerts.title")}
          </h1>
        </div>
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
                  {notifyAll && isAdmin
                    ? t("alerts.notifyAllHelp")
                    : t("alerts.notifyRelatedHelp")}
                </p>
              </div>
              {isAdmin ? (
                <div className="space-y-2">
                  <Label>{t("alerts.selectMember")}</Label>
                  <Select value={selectedMemberId} onValueChange={handleMemberChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("alerts.selectMember")} />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => {
                        const alias = persons.find((p) => p.userId === m.userId);
                        const label = m.user.displayName || m.user.email;
                        return (
                          <SelectItem key={m.userId} value={m.userId} disabled={!alias}>
                            {label}
                            {!alias && ` (${t("alerts.memberWithoutAlias")})`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{t("alerts.selectMember")}</Label>
                  <div className="rounded-md border px-3 py-2 text-sm">
                    {persons.find((p) => p.userId === currentUserId)?.alias || t("alerts.noLinkedPerson")}
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="notifyAll"
                    checked={notifyAll}
                    onCheckedChange={(c) => setNotifyAll(c === true)}
                  />
                  <Label htmlFor="notifyAll">{t("alerts.notifyAll")}</Label>
                </div>
              )}
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
              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                disabled={!selectedPerson}
              >
                {t("alerts.create")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loadingAlerts ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[var(--muted-foreground)]">{t("common.loading")}</p>
          </CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-green-300" />
            <p className="text-[var(--muted-foreground)]">{t("alerts.emptyState")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const createdByYou = alert.createdById === currentUserId;
            const createdByLabel = createdByYou
              ? t("alerts.createdByYou")
              : alert.isAnonymous
                ? t("alerts.createdAnonymously")
                : t("alerts.createdBy").replace(
                    "{name}",
                    alert.createdBy?.displayName || alert.createdBy?.email || t("alerts.unknownCreator")
                  );
            const titleLabel = alert.notifyAll
              ? t("alerts.notifyAll")
              : alert.isAnonymous && !createdByYou
                ? t("alerts.anonymousAlert")
                : alert.personAlias.alias;

            return (
              <Card key={alert.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      {titleLabel}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-[var(--muted-foreground)]">{createdByLabel}</p>
                  {alert.message && (
                    <div className="rounded-md border p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                        {t("alerts.message")}
                      </p>
                      <p className="mt-2">{alert.message}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{t("alerts.recipients")}</p>
                    {alert.recipientsHidden ? (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {t("alerts.recipientsHidden")}
                      </p>
                    ) : alert.recipients.length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {t("alerts.noRecipients")}
                      </p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {alert.recipients.map((recipient) => (
                          <Badge key={recipient.id} variant="secondary">
                            {recipient.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
