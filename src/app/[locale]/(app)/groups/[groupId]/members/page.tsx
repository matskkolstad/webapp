"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, UserCircle } from "lucide-react";

interface Member {
  userId: string;
  role: string;
  createdAt: string;
  user: { id: string; displayName: string | null; email: string };
}

export default function MembersPage() {
  const t = useTranslations();
  const params = useParams();
  const groupId = params.groupId as string;
  const router = useRouter();
  const { addToast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/groups/${groupId}/members`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/groups/${groupId}`).then((r) => r.json()),
    ]).then(([membersData, meData, groupData]) => {
      setMembers(membersData?.members || []);
      setCurrentUserId(meData?.user?.id ?? null);
      setIsAdmin(["admin", "owner"].includes(groupData?.group?.currentUserRole));
      setLoading(false);
    });
  }, [groupId]);

  async function refreshMembers() {
    const data = await fetch(`/api/groups/${groupId}/members`).then((r) => r.json());
    setMembers(data.members || []);
  }

  async function handleRoleChange(userId: string, role: "admin" | "member") {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }

      addToast({ title: t("common.success"), variant: "success" });
      await refreshMembers();
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm(t("groups.confirmRemoveMember"))) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }

      addToast({ title: t("common.success"), variant: "success" });
      await refreshMembers();
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  if (loading) return <div className="py-12 text-center">{t("common.loading")}</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{t("groups.members")}</h1>
        </div>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCircle className="mx-auto mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
            <p className="text-[var(--muted-foreground)]">{t("groups.noMembers")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const displayName = member.user.displayName || member.user.email;
            const showOwnerAdmin = member.role === "owner";
            const showAdmin = member.role === "admin" || member.role === "owner";
            return (
              <Card key={member.userId}>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{displayName}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{member.user.email}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="secondary">{t("groups.roles.member")}</Badge>
                      {showAdmin && (
                        <Badge variant="default">{t("groups.roles.admin")}</Badge>
                      )}
                      {showOwnerAdmin && (
                        <Badge variant="outline">{t("groups.roles.owner")}</Badge>
                      )}
                    </div>
                  </div>
                  {isAdmin && !isSelf && (
                    <div className="flex flex-col gap-2">
                      {member.role === "member" ? (
                        <Button size="sm" onClick={() => handleRoleChange(member.userId, "admin")}>
                          {t("groups.makeAdmin")}
                        </Button>
                      ) : member.role === "admin" ? (
                        <Button size="sm" variant="outline" onClick={() => handleRoleChange(member.userId, "member")}>
                          {t("groups.removeAdmin")}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="destructive" onClick={() => handleRemove(member.userId)}>
                        {t("groups.removeMember")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
