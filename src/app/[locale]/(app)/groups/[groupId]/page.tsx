"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Users, AlertTriangle, Settings, Plus, UserCircle } from "lucide-react";

export default function GroupPage() {
  const t = useTranslations();
  const params = useParams();
  const groupId = params.groupId as string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [group, setGroup] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    fetch(`/api/groups/${groupId}`)
      .then((r) => r.json())
      .then((d) => setGroup(d.group));
  }, [groupId]);

  if (!group) return <div className="py-12 text-center">{t("common.loading")}</div>;

  const cards = [
    {
      href: `/groups/${groupId}/graph`,
      icon: Network,
      title: t("graph.title"),
      description: "Visualiser nettverket",
      color: "text-purple-500",
    },
    {
      href: `/groups/${groupId}/relationships`,
      icon: Plus,
      title: t("relationships.title"),
      description: "Se og legg til relasjoner",
      color: "text-pink-500",
    },
    {
      href: `/groups/${groupId}/persons`,
      icon: UserCircle,
      title: t("groups.persons"),
      description: `${(group._count as Record<string, number>)?.personAliases || 0} ${t("groups.personCountLabel")}`,
      color: "text-blue-500",
    },
    {
      href: `/groups/${groupId}/members`,
      icon: Users,
      title: t("groups.members"),
      description: `${(group._count as Record<string, number>)?.memberships || 0} ${t("groups.memberCountLabel")}`,
      color: "text-emerald-500",
    },
    {
      href: `/groups/${groupId}/alerts`,
      icon: AlertTriangle,
      title: t("alerts.title"),
      description: "Smittevarsling",
      color: "text-yellow-500",
    },
    {
      href: `/groups/${groupId}/settings`,
      icon: Settings,
      title: t("groups.settings"),
      description: "Administrer gruppen",
      color: "text-gray-500",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{group.name as string}</h1>
          <Badge>{t(`groups.roles.${group.currentUserRole}`)}</Badge>
        </div>
        {group.description && (
          <p className="mt-2 text-[var(--muted-foreground)]">{group.description as string}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--muted-foreground)]">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
