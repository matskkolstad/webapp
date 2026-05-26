"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Network } from "lucide-react";

interface GraphNode {
  data: { id: string; label: string; isLinkedUser: boolean };
}
interface GraphEdge {
  data: {
    id: string;
    source: string;
    target: string;
    status: "unverified" | "pending" | "verified";
    protectionStatus: string | null;
    eventDate: string | null;
  };
}

export default function GraphPage() {
  const t = useTranslations();
  const params = useParams();
  const groupId = params.groupId as string;
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<unknown>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const searchParams = new URLSearchParams();
      if (verifiedOnly) searchParams.set("verifiedOnly", "true");

      const res = await fetch(`/api/groups/${groupId}/graph?${searchParams}`);
      const data = await res.json();
      if (!cancelled) {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [groupId, verifiedOnly]);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cy: any;

    import("cytoscape").then((cytoscapeModule) => {
      const cytoscape = cytoscapeModule.default;

      const layout = {
        name: "cose",
        padding: 50,
        nodeRepulsion: 24000,
        idealEdgeLength: 220,
        nodeOverlap: 0,
        spacingFactor: 1.8,
        animate: true,
        animationDuration: 800,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
      } as const;

      cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...nodes.map((node) => ({ ...node, group: "nodes" as const })),
          ...edges.map((edge) => ({ ...edge, group: "edges" as const })),
        ],
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "background-color": "#8b5cf6",
              color: "#fff",
              "text-valign": "center",
              "text-halign": "center",
              "font-size": "13px",
              shape: "ellipse",
              width: 110,
              height: 110,
              padding: "12px",
              "text-outline-color": "#6d28d9",
              "text-outline-width": 1,
              "text-wrap": "wrap",
              "text-max-width": "90px",
            } as Record<string, unknown>,
          },
          {
            selector: "edge",
            style: {
              width: 6,
              "line-color": "#111",
              opacity: 1,
              "curve-style": "straight",
              "target-arrow-shape": "none",
              display: "element",
            } as Record<string, unknown>,
          },
          {
            selector: 'edge[status = "pending"]',
            style: {
              "line-color": "#facc15",
              width: 3,
            } as Record<string, unknown>,
          },
          {
            selector: 'edge[status = "verified"]',
            style: {
              "line-color": "#22c55e",
              width: 3,
            } as Record<string, unknown>,
          },
        ],
        layout,
      }) as unknown as typeof cy;

      cy.layout(layout).run();
      cy.on("layoutstop", () => {
        const seen = new Map<string, number>();
        cy.nodes().forEach((node: any) => {
          const pos = node.position();
          const key = `${Math.round(pos.x)}:${Math.round(pos.y)}`;
          const count = seen.get(key) ?? 0;
          if (count > 0) {
            const offset = 24 * count;
            node.position({ x: pos.x + offset, y: pos.y + offset });
          }
          seen.set(key, count + 1);
        });

        const minDistance = 160;
        for (let i = 0; i < 3; i += 1) {
          cy.edges().forEach((edge: any) => {
            const source = edge.source();
            const target = edge.target();
            const sp = source.position();
            const tp = target.position();
            const dx = tp.x - sp.x;
            const dy = tp.y - sp.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < minDistance) {
              const push = (minDistance - dist) / 2;
              const ux = dx / dist;
              const uy = dy / dist;
              source.position({ x: sp.x - ux * push, y: sp.y - uy * push });
              target.position({ x: tp.x + ux * push, y: tp.y + uy * push });
            }
          });
        }
        cy.fit(undefined, 50);
      });

      cyRef.current = cy;
      if (typeof window !== "undefined") {
        (window as Window & { __cy?: unknown }).__cy = cy;
      }
    });

    return () => {
      if (cy) cy.destroy();
    };
  }, [nodes, edges]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="h-8 w-8 text-purple-500" />
            {t("graph.title")}
          </h1>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card className="relative">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-[60vh] min-h-[420px] lg:h-[600px] items-center justify-center">
                {t("common.loading")}
              </div>
            ) : nodes.length === 0 ? (
              <div className="flex h-[60vh] min-h-[420px] lg:h-[600px] flex-col items-center justify-center text-[var(--muted-foreground)]">
                <Network className="mb-4 h-16 w-16 opacity-30" />
                <p>{t("graph.emptyState")}</p>
              </div>
            ) : (
              <div ref={containerRef} className="h-[60vh] min-h-[420px] lg:h-[600px] w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("graph.filters")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="verifiedOnly"
                checked={verifiedOnly}
                onCheckedChange={(c) => setVerifiedOnly(c === true)}
              />
              <Label htmlFor="verifiedOnly">{t("graph.showVerifiedOnly")}</Label>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-medium">{t("graph.title")}</p>
              <div className="flex gap-2">
                <Badge>{nodes.length} noder</Badge>
                <Badge variant="secondary">{edges.length} kanter</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
