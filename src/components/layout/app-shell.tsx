"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";
import {
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
} from "lucide-react";

interface AppShellProps {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    locale: string;
  };
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = [
    { href: "/dashboard", label: t("groups.title"), icon: Home },
    { href: "/notifications", label: t("notifications.title"), icon: Bell },
    { href: "/settings", label: t("settings.title"), icon: Settings },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  useEffect(() => {
    let cancelled = false;

    const loadUnreadCount = async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) {
        setUnreadCount(data.unreadCount || 0);
      }
    };

    loadUnreadCount();

    const handleCountUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<number | undefined>;
      if (typeof customEvent.detail === "number") {
        setUnreadCount(customEvent.detail);
        return;
      }
      loadUnreadCount();
    };

    window.addEventListener("notifications-count", handleCountUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("notifications-count", handleCountUpdate);
    };
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      {/* Mobile menu button */}
      <button
        className="fixed left-4 top-4 z-50 rounded-md bg-[var(--background)] p-2 shadow-md lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-[var(--card)] transition-transform lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo.svg" alt={t("common.appName")} width={140} height={28} className="h-7 w-auto" />
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors lg:py-2 ${
                    isActive
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/notifications" && unreadCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]">
                {(user.displayName || user.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 truncate">
                <p className="text-sm font-medium">{user.displayName || user.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t("auth.logout")}
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-6xl px-4 pb-8 pt-16 lg:px-8 lg:pt-8">
          <PageTransition routeKey={pathname}>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
