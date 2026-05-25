"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Bell, Check } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const t = useTranslations();
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        setNotifications(d.notifications || []);
        setLoading(false);
      });
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    addToast({ title: t("common.success"), variant: "success" });
  }

  if (loading) return <div className="py-12 text-center">{t("common.loading")}</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("notifications.title")}</h1>
        {notifications.some((n) => !n.readAt) && (
          <Button variant="outline" onClick={markAllRead}>
            <Check className="mr-2 h-4 w-4" />
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
            <p className="text-[var(--muted-foreground)]">{t("notifications.emptyState")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card key={notif.id} className={notif.readAt ? "opacity-60" : ""}>
              <CardContent className="flex items-start gap-3 py-4">
                <Bell className="mt-1 h-5 w-5 text-[var(--primary)]" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{notif.title}</p>
                    {!notif.readAt && <Badge variant="default" className="text-xs">Ny</Badge>}
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">{notif.body}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
