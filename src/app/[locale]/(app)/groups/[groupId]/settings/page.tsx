"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Copy, Key } from "lucide-react";

export default function GroupSettingsPage() {
  const t = useTranslations();
  const params = useParams();
  const groupId = params.groupId as string;
  const { addToast } = useToast();
  const [invites, setInvites] = useState<Array<{ id: string; code: string; expiresAt: string; uses: number }>>([]);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/invite`)
      .then((r) => r.json())
      .then((d) => setInvites(d.invites || []))
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

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{t("groups.settings")}</h1>

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
    </div>
  );
}
