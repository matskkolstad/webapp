"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Network } from "lucide-react";

interface GraphNode {
  data: { id: string; label: string; isLinkedUser: boolean };
}
interface GraphEdge {
  data: {
    id: string;
    source: string;
    target: string;
    verified: boolean;
    protectionStatus: string | null;
    eventDate: string | null;
  };
}

export default function GraphPage() {
  const t = useTranslations();
  const params = useParams();
  const groupId = params.groupId as string;
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

      cy = cytoscape({
        container: containerRef.current,
        elements: [...nodes, ...edges],
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "background-color": "#8b5cf6",
              color: "#fff",
              "text-valign": "center",
              "text-halign": "center",
              "font-size": "12px",
              width: 45,
              height: 45,
              "text-wrap": "wrap",
              "text-max-width": "80px",
            } as Record<string, unknown>,
          },
          {
            selector: "edge",
            style: {
              width: 2,
              "line-color": "#d946ef",
              "curve-style": "bezier",
              "target-arrow-shape": "none",
            } as Record<string, unknown>,
          },
          {
            selector: "edge[verified]",
            style: {
              "line-style": "solid",
              width: 3,
            } as Record<string, unknown>,
          },
        ],
        layout: {
          name: "cose",
          padding: 50,
          animate: true,
          animationDuration: 500,
        },
      }) as unknown as typeof cy;

      cyRef.current = cy;
    });

    return () => {
      if (cy) cy.destroy();
    };
  }, [nodes, edges]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Network className="h-8 w-8 text-purple-500" />
          {t("graph.title")}
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card className="relative">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-[600px] items-center justify-center">
                {t("common.loading")}
              </div>
            ) : nodes.length === 0 ? (
              <div className="flex h-[600px] flex-col items-center justify-center text-[var(--muted-foreground)]">
                <Network className="mb-4 h-16 w-16 opacity-30" />
                <p>{t("graph.emptyState")}</p>
              </div>
            ) : (
              <div ref={containerRef} className="h-[600px] w-full" />
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
