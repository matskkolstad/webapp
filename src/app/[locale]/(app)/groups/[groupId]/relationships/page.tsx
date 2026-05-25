"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Plus, Heart, Check } from "lucide-react";

interface Person {
  id: string;
  alias: string;
}

interface Relationship {
  id: string;
  personA: Person;
  personB: Person;
  eventDate: string | null;
  protectionStatus: string | null;
  verification: { verifiedAt: string } | null;
  createdAt: string;
}

export default function RelationshipsPage() {
  const t = useTranslations();
  const params = useParams();
  const groupId = params.groupId as string;
  const { addToast } = useToast();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [personAId, setPersonAId] = useState("");
  const [personBId, setPersonBId] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/groups/${groupId}/relationships`).then((r) => r.json()),
      fetch(`/api/groups/${groupId}/persons`).then((r) => r.json()),
    ]).then(([relData, personData]) => {
      setRelationships(relData.relationships || []);
      setPersons(personData.persons || []);
      setLoading(false);
    });
  }, [groupId]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }

      addToast({ title: t("common.success"), variant: "success" });
      setDialogOpen(false);
      // Refresh
      const relRes = await fetch(`/api/groups/${groupId}/relationships`);
      const relData = await relRes.json();
      setRelationships(relData.relationships || []);
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  if (loading) return <div className="py-12 text-center">{t("common.loading")}</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("relationships.title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                <Select onValueChange={setPersonAId}>
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
                <Select onValueChange={setPersonBId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("alerts.selectPerson")} />
                  </SelectTrigger>
                  <SelectContent>
                    {persons.filter((p) => p.id !== personAId).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.alias}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <Button type="submit" className="w-full" disabled={!personAId || !personBId}>
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
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-pink-500" />
                  <span className="font-medium">{rel.personA.alias}</span>
                  <span className="text-[var(--muted-foreground)]">&</span>
                  <span className="font-medium">{rel.personB.alias}</span>
                </div>
                <div className="flex items-center gap-2">
                  {rel.protectionStatus && (
                    <Badge variant={rel.protectionStatus === "protected" ? "default" : rel.protectionStatus === "unprotected" ? "destructive" : "secondary"}>
                      {t(`relationships.${rel.protectionStatus}`)}
                    </Badge>
                  )}
                  {rel.verification ? (
                    <Badge variant="default" className="bg-green-500">
                      <Check className="mr-1 h-3 w-3" />
                      {t("relationships.verified")}
                    </Badge>
                  ) : (
                    <Badge variant="outline">{t("relationships.unverified")}</Badge>
                  )}
                  {rel.eventDate && (
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {new Date(rel.eventDate).toLocaleDateString()}
                    </span>
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
