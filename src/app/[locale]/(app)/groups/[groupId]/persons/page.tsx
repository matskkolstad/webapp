"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Plus, UserCircle } from "lucide-react";

interface Person {
  id: string;
  alias: string;
  contactToken: string | null;
  userId: string | null;
  createdAt: string;
}

export default function PersonsPage() {
  const t = useTranslations();
  const params = useParams();
  const groupId = params.groupId as string;
  const router = useRouter();
  const { addToast } = useToast();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [relationDialogOpen, setRelationDialogOpen] = useState(false);
  const [relationPersonAId, setRelationPersonAId] = useState<string | null>(null);
  const [relationPersonBId, setRelationPersonBId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [relationships, setRelationships] = useState<Array<{ personA: { id: string }; personB: { id: string } }>>([]);
  const [relationError, setRelationError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/groups/${groupId}/persons`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/groups/${groupId}`).then((r) => r.json()),
      fetch(`/api/groups/${groupId}/relationships`).then((r) => r.json()),
    ]).then(([personsData, meData, groupData, relationshipData]) => {
      setPersons(personsData?.persons || []);
      setCurrentUserId(meData?.user?.id ?? null);
      setCurrentUserName(meData?.user?.displayName ?? null);
      setIsAdmin(["admin", "owner"].includes(groupData?.group?.currentUserRole));
      setRelationships(relationshipData?.relationships || []);
      setLoading(false);
    });
  }, [groupId]);

  function pairKey(a: string, b: string) {
    return [a, b].sort().join("::");
  }

  const existingPairs = new Set(
    relationships.map((rel) => pairKey(rel.personA.id, rel.personB.id))
  );

  const duplicateSelected =
    !!relationPersonAId &&
    !!relationPersonBId &&
    existingPairs.has(pairKey(relationPersonAId, relationPersonBId));

  async function handleLink(personId: string) {
    try {
      const res = await fetch(`/api/groups/${groupId}/persons/${personId}/link`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }

      addToast({ title: t("common.success"), variant: "success" });
      const data = await fetch(`/api/groups/${groupId}/persons`).then((r) => r.json());
      setPersons(data.persons || []);
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleUnlink(personId: string) {
    try {
      const res = await fetch(`/api/groups/${groupId}/persons/${personId}/unlink`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }

      addToast({ title: t("common.success"), variant: "success" });
      const data = await fetch(`/api/groups/${groupId}/persons`).then((r) => r.json());
      setPersons(data.persons || []);
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleDeletePerson(personId: string) {
    if (!confirm(t("persons.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/persons/${personId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }

      addToast({ title: t("common.success"), variant: "success" });
      const data = await fetch(`/api/groups/${groupId}/persons`).then((r) => r.json());
      setPersons(data.persons || []);
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  function openRelationDialog(personId: string) {
    const linkedPerson = persons.find((p) => p.userId === currentUserId);
    if (!linkedPerson) {
      addToast({ title: t("persons.linkAccountFirst"), variant: "destructive" });
      return;
    }
    if (linkedPerson.id === personId) {
      addToast({ title: t("common.error"), variant: "destructive" });
      return;
    }
    setRelationPersonAId(linkedPerson.id);
    setRelationPersonBId(personId);
    setRelationError(null);
    setRelationDialogOpen(true);
  }

  async function handleCreateRelation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!relationPersonAId || !relationPersonBId) return;
    if (existingPairs.has(pairKey(relationPersonAId, relationPersonBId))) {
      setRelationError(t("relationships.duplicateError"));
      return;
    }
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personAId: relationPersonAId,
          personBId: relationPersonBId,
          eventDate: formData.get("eventDate") || null,
          protectionStatus: formData.get("protectionStatus") || null,
          notes: formData.get("notes") || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data?.error === "Relationship already exists") {
          setRelationError(t("relationships.duplicateError"));
          return;
        }
        setRelationError(data.error || t("common.error"));
        return;
      }

      addToast({ title: t("common.success"), variant: "success" });
      setRelationDialogOpen(false);
      setRelationError(null);
    } catch {
      setRelationError(t("common.error"));
    }
  }

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
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{t("persons.title")}</h1>
        </div>
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

      <Dialog open={relationDialogOpen} onOpenChange={setRelationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("persons.linkRelationship")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRelation} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("persons.linkedToMe")}</Label>
              <div className="rounded-md border px-3 py-2 text-sm">
                {persons.find((p) => p.id === relationPersonAId)?.alias || "-"}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("persons.relationWith")}</Label>
              <div className="rounded-md border px-3 py-2 text-sm">
                {persons.find((p) => p.id === relationPersonBId)?.alias || "-"}
              </div>
            </div>
            {relationError && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                {relationError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="eventDate">{t("relationships.date")}</Label>
              <Input id="eventDate" name="eventDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label>{t("relationships.protection")}</Label>
              <Select name="protectionStatus">
                <SelectTrigger>
                  <SelectValue placeholder={t("relationships.unknown")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="protected">{t("relationships.protected")}</SelectItem>
                  <SelectItem value="unprotected">{t("relationships.unprotected")}</SelectItem>
                  <SelectItem value="unknown">{t("relationships.unknown")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{t("relationships.notes")}</Label>
              <Input id="notes" name="notes" />
            </div>
            <Button type="submit" className="w-full" disabled={!relationPersonAId || !relationPersonBId || duplicateSelected}>
              {t("relationships.add")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {persons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCircle className="mx-auto mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
            <p className="text-[var(--muted-foreground)]">{t("persons.emptyState")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {persons.map((person) => {
            const linkedPersonId = persons.find((p) => p.userId === currentUserId)?.id;
            const isLinkedToMe = person.userId === currentUserId;
            const isLinkedToOther = !!person.userId && person.userId !== currentUserId;
            const aliasNormalized = person.alias.trim().toLowerCase();
            const displayNameNormalized = currentUserName?.trim().toLowerCase();
            const firstNameNormalized = displayNameNormalized?.split(" ")[0];
            const isAliasMatch =
              !!displayNameNormalized &&
              (aliasNormalized === displayNameNormalized ||
                aliasNormalized === firstNameNormalized);
            const canLink =
              !person.userId &&
              (!linkedPersonId || linkedPersonId === person.id || isAliasMatch);
            const canRelate = !!linkedPersonId && linkedPersonId !== person.id;

            return (
            <Card key={person.id}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]">
                  {person.alias[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{person.alias}</p>
                  {isLinkedToMe && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge className="text-xs bg-emerald-500 text-white hover:bg-emerald-500">
                        {t("persons.linkedToMe")}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnlink(person.id)}
                      >
                        {t("persons.unlinkFromMe")}
                      </Button>
                    </div>
                  )}
                  {isLinkedToOther && (
                    <Badge className="mt-1 text-xs bg-yellow-500 text-black hover:bg-yellow-500">
                      {t("persons.linkedToOther")}
                    </Badge>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!person.userId && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleLink(person.id)}
                          disabled={!canLink}
                        >
                          {t("persons.linkToMe")}
                        </Button>
                        {!canLink && (
                          <Badge className="bg-red-500 text-white hover:bg-red-500">
                            {t("persons.linkLimitReached")}
                          </Badge>
                        )}
                      </>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openRelationDialog(person.id)}
                      disabled={persons.length < 2 || !canRelate}
                    >
                      {t("persons.linkRelationship")}
                    </Button>
                    {isAdmin && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePerson(person.id)}
                      >
                        {t("persons.delete")}
                      </Button>
                    )}
                  </div>
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
