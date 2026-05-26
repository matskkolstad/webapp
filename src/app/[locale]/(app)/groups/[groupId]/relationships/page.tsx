"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Plus, Heart, Check } from "lucide-react";

interface Person {
  id: string;
  alias: string;
}

interface Relationship {
  id: string;
  personA: Person;
  personB: Person;
  personAId: string;
  personBId: string;
  eventDate: string | null;
  protectionStatus: string | null;
  status: "unverified" | "pending" | "verified";
  confirmationsCount: number;
  confirmedByMe: boolean;
  createdAt: string;
}

export default function RelationshipsPage() {
  const t = useTranslations();
  const params = useParams();
  const groupId = params.groupId as string;
  const router = useRouter();
  const { addToast } = useToast();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [personAId, setPersonAId] = useState("");
  const [personBId, setPersonBId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [currentUserPersonId, setCurrentUserPersonId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/groups/${groupId}/relationships`).then((r) => r.json()),
      fetch(`/api/groups/${groupId}/persons`).then((r) => r.json()),
      fetch(`/api/groups/${groupId}`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
    ]).then(([relData, personData, groupData, meData]) => {
      setRelationships(relData.relationships || []);
      setPersons(personData.persons || []);
      setIsAdmin(["admin", "owner"].includes(groupData?.group?.currentUserRole));
      setCurrentUserId(meData?.user?.id ?? null);
      const linked = (personData.persons || []).find((p: { id: string; userId: string | null }) => p.userId === meData?.user?.id);
      setCurrentUserPersonId(linked?.id ?? null);
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
    !!personAId &&
    !!personBId &&
    existingPairs.has(pairKey(personAId, personBId));

  async function handleDeleteRelationship(relationshipId: string) {
    if (!confirm(t("relationships.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/relationships/${relationshipId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }

      addToast({ title: t("common.success"), variant: "success" });
      const relRes = await fetch(`/api/groups/${groupId}/relationships`);
      const relData = await relRes.json();
      setRelationships(relData.relationships || []);
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleConfirmRelationship(relationshipId: string) {
    try {
      const res = await fetch(`/api/relationships/${relationshipId}/confirm`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }

      addToast({ title: t("common.success"), variant: "success" });
      const relRes = await fetch(`/api/groups/${groupId}/relationships`);
      const relData = await relRes.json();
      setRelationships(relData.relationships || []);
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleUnconfirmRelationship(relationshipId: string) {
    try {
      const res = await fetch(`/api/relationships/${relationshipId}/unconfirm`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }

      addToast({ title: t("common.success"), variant: "success" });
      const relRes = await fetch(`/api/groups/${groupId}/relationships`);
      const relData = await relRes.json();
      setRelationships(relData.relationships || []);
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRelationError(null);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personAId,
          personBId,
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
      setDialogOpen(false);
      setRelationError(null);
      // Refresh
      const relRes = await fetch(`/api/groups/${groupId}/relationships`);
      const relData = await relRes.json();
      setRelationships(relData.relationships || []);
    } catch {
      setRelationError(t("common.error"));
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
          <h1 className="text-3xl font-bold">{t("relationships.title")}</h1>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (open) {
              setPersonAId("");
              setPersonBId("");
              setRelationError(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("relationships.add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("relationships.add")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Person A</Label>
                <Select onValueChange={(value) => {
                  setPersonAId(value);
                  setRelationError(null);
                  if (personBId && existingPairs.has(pairKey(value, personBId))) {
                    setRelationError(t("relationships.duplicateError"));
                  }
                }}>
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
              <div className="space-y-2">
                <Label>Person B</Label>
                <Select onValueChange={(value) => {
                  setPersonBId(value);
                  setRelationError(null);
                  if (personAId && existingPairs.has(pairKey(personAId, value))) {
                    setRelationError(t("relationships.duplicateError"));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("alerts.selectPerson")} />
                  </SelectTrigger>
                  <SelectContent>
                    {persons.filter((p) => p.id !== personAId).map((p) => {
                      const isDuplicate = !!personAId && existingPairs.has(pairKey(personAId, p.id));
                      return (
                        <SelectItem key={p.id} value={p.id} disabled={isDuplicate}>
                          {p.alias}{isDuplicate ? ` (${t("relationships.alreadyRelated")})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
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
              <Button type="submit" className="w-full" disabled={!personAId || !personBId || duplicateSelected}>
                {t("relationships.add")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {relationships.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="mx-auto mb-4 h-12 w-12 text-pink-300" />
            <p className="text-[var(--muted-foreground)]">{t("relationships.emptyState")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {relationships.map((rel) => (
            <Card key={rel.id}>
              <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-pink-500" />
                  <span className="font-medium">{rel.personA.alias}</span>
                  <span className="text-[var(--muted-foreground)]">&</span>
                  <span className="font-medium">{rel.personB.alias}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {rel.protectionStatus && (
                    <Badge variant={rel.protectionStatus === "protected" ? "default" : rel.protectionStatus === "unprotected" ? "destructive" : "secondary"}>
                      {t(`relationships.${rel.protectionStatus}`)}
                    </Badge>
                  )}
                  {rel.status === "verified" && (
                    <Badge className="bg-green-500 text-white">
                      <Check className="mr-1 h-3 w-3" />
                      {t("relationships.verified")}
                    </Badge>
                  )}
                  {rel.status === "pending" && (
                    <Badge className="bg-yellow-500 text-black">
                      {t("relationships.pending")}
                    </Badge>
                  )}
                  {rel.status === "unverified" && (
                    <Badge className="bg-red-500 text-white">
                      {t("relationships.unverified")}
                    </Badge>
                  )}
                  {rel.eventDate && (
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {new Date(rel.eventDate).toLocaleDateString()}
                    </span>
                  )}
                  {(currentUserPersonId && [rel.personAId, rel.personBId].includes(currentUserPersonId)) && !rel.confirmedByMe && (
                    <Button size="sm" onClick={() => handleConfirmRelationship(rel.id)}>
                      {t("relationships.confirm")}
                    </Button>
                  )}
                  {(rel.confirmedByMe || (isAdmin && rel.status !== "unverified")) && (
                    <Button size="sm" variant="outline" onClick={() => handleUnconfirmRelationship(rel.id)}>
                      {t("relationships.unconfirm")}
                    </Button>
                  )}
                  {isAdmin && rel.status !== "verified" && (
                    <Button size="sm" variant="secondary" onClick={() => handleConfirmRelationship(rel.id)}>
                      {t("relationships.confirmAsAdmin")}
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteRelationship(rel.id)}>
                      {t("relationships.delete")}
                    </Button>
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
