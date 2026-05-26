"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Bell, Check } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  metadata?: {
    relationshipId?: string;
    groupId?: string;
    personAId?: string;
    personBId?: string;
    message?: string | null;
    isAnonymous?: boolean;
    reportedBy?: string | null;
  };
}

export default function NotificationsPage() {
  const t = useTranslations();
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        setNotifications(d.notifications || []);
        setUnreadCount(d.unreadCount || 0);
        setLoading(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("notifications-count", { detail: d.unreadCount || 0 }));
        }
      });
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("notifications-count", { detail: 0 }));
    }
    addToast({ title: t("common.success"), variant: "success" });
  }

  async function markRead(notificationId: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: [notificationId] }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((prev) => {
      const next = Math.max(0, prev - 1);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("notifications-count", { detail: next }));
      }
      return next;
    });
  }

  async function openDetails(notification: Notification) {
    setSelectedNotification(notification);
    setDetailsOpen(true);
    if (!notification.readAt) {
      await markRead(notification.id);
    }
  }

  async function handleConfirm(notification: Notification) {
    const relationshipId = notification.metadata?.relationshipId;
    if (!relationshipId) return;
    try {
      const res = await fetch(`/api/relationships/${relationshipId}/confirm`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }
      await markRead(notification.id);
      addToast({ title: t("common.success"), variant: "success" });
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleDecline(notification: Notification) {
    const relationshipId = notification.metadata?.relationshipId;
    if (!relationshipId) return;
    try {
      const res = await fetch(`/api/relationships/${relationshipId}/unconfirm`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        addToast({ title: data.error || t("common.error"), variant: "destructive" });
        return;
      }
      await markRead(notification.id);
      addToast({ title: t("common.success"), variant: "success" });
    } catch {
      addToast({ title: t("common.error"), variant: "destructive" });
    }
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
                    {!notif.readAt && <Badge variant="default" className="text-xs">{t("notifications.new")}</Badge>}
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">{notif.body}</p>
                  {notif.type === "exposure_alert" && notif.metadata?.message && (
                    <p className="mt-1 text-sm">{notif.metadata.message}</p>
                  )}
                  {notif.type === "relationship_request" && !notif.readAt && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleConfirm(notif)}>
                        {t("relationships.confirm")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDecline(notif)}>
                        {t("relationships.decline")}
                      </Button>
                    </div>
                  )}
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={() => openDetails(notif)}>
                      {t("notifications.readMore")}
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNotification?.title}</DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-3 text-sm">
              <p className="text-[var(--muted-foreground)]">{selectedNotification.body}</p>
              {selectedNotification.type === "exposure_alert" && (
                <div className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                    {t("notifications.message")}
                  </p>
                  <p className="mt-2">
                    {selectedNotification.metadata?.message || t("notifications.noMessage")}
                  </p>
                  {!selectedNotification.metadata?.isAnonymous && selectedNotification.metadata?.reportedBy && (
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      {t("notifications.reportedBy").replace("{name}", selectedNotification.metadata.reportedBy)}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-[var(--muted-foreground)]">
                {new Date(selectedNotification.createdAt).toLocaleString()}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
