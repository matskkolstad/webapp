"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Copy, Key } from "lucide-react";

export default function GroupSettingsPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const locale = params.locale as string;
  const { addToast } = useToast();
  const [invites, setInvites] = useState<Array<{ id: string; code: string; expiresAt: string; uses: number }>>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/groups/${groupId}/invite`).then((r) => r.json()),
      fetch(`/api/groups/${groupId}`).then((r) => r.json()),
    ])
      .then(([inviteData, groupData]) => {
        setInvites(inviteData.invites || []);
        setIsAdmin(["admin", "owner"].includes(groupData?.group?.currentUserRole));
      })
      .catch(() => {});
  }, [groupId]);

  async function generateInvite() {
    try {
      const res = await fetch(`/api/groups/${groupId}/invite`, { method: "POST" });
      if (!res.ok) {
        addToast({ title: t("common.error"), variant: "destructive" });
        return;
      }
      const data = await res.json();
      setInvites((prev) => [data.invite, ...prev]);
      addToast({ title: t("common.success"), variant: "success" });
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    addToast({ title: "Kopiert!", variant: "success" });
  }

  async function handleDeleteGroup() {
    if (!confirm(t("groups.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }
      addToast({ title: t("common.success"), variant: "success" });
      router.push(`/${locale}/dashboard`);
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleLeaveGroup() {
    if (!confirm(t("groups.confirmLeave"))) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }
      addToast({ title: t("common.success"), variant: "success" });
      router.push(`/${locale}/dashboard`);
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label={t("common.back")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">{t("groups.settings")}</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t("groups.inviteCode")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={generateInvite}>
            {t("groups.generateCode")}
          </Button>

          {invites.length > 0 && (
            <div className="space-y-2">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <code className="rounded bg-[var(--muted)] px-2 py-1 font-mono text-lg">
                      {invite.code}
                    </code>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Brukt: {invite.uses} | Utløper: {new Date(invite.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyCode(invite.code)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t("groups.leaveGroup")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleLeaveGroup}>
            {t("groups.leaveGroup")}
          </Button>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>{t("groups.adminActions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleDeleteGroup}>
              {t("groups.deleteGroup")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
