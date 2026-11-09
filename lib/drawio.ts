import type { DiagramDoc } from '@/types';

/**
 * Builds a draw.io (.drawio / mxfile) document from a normalised diagram spec.
 * Used instead of asking the LLM for raw XML, which is fragile. Pure function:
 * safe to use on both server (zip export) and client (download button).
 */

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const W = 160;
const H = 60;
const GAP_X = 70;
const GAP_Y = 70;

const GROUP_COLORS = ['#dae8fc', '#d5e8d4', '#fff2cc', '#f8cecc', '#e1d5e7', '#ffe6cc'];

export function diagramToDrawio(diagram: DiagramDoc, name = 'Diagram'): string {
  const nodes = diagram.nodes ?? [];
  const known = new Set(nodes.map((n) => n.id));
  const edges = (diagram.edges ?? []).filter((e) => known.has(e.from) && known.has(e.to));

  // Layered layout: depth = longest path from a root (cycle-safe via iteration cap).
  const depth: Record<string, number> = Object.fromEntries(nodes.map((n) => [n.id, 0]));
  for (let i = 0; i < nodes.length; i++) {
    let changed = false;
    for (const e of edges) {
      if (e.from !== e.to && depth[e.to] < depth[e.from] + 1 && depth[e.from] + 1 < nodes.length) {
        depth[e.to] = depth[e.from] + 1;
        changed = true;
      }
    }
    if (!changed) break;
  }
  const layers: string[][] = [];
  for (const n of nodes) (layers[depth[n.id]] ??= []).push(n.id);

  const pos: Record<string, { x: number; y: number }> = {};
  const widest = Math.max(1, ...layers.map((l) => (l ? l.length : 0)));
  layers.forEach((layer, row) => {
    if (!layer) return;
    const offset = ((widest - layer.length) * (W + GAP_X)) / 2;
    layer.forEach((id, col) => {
      pos[id] = { x: 40 + offset + col * (W + GAP_X), y: 40 + row * (H + GAP_Y) };
    });
  });

  const groups = [...new Set(nodes.map((n) => n.group).filter(Boolean))] as string[];
  const cells: string[] = [];
  nodes.forEach((n, i) => {
    const fill = n.group ? GROUP_COLORS[groups.indexOf(n.group) % GROUP_COLORS.length] : '#dae8fc';
    const x = pos[n.id]?.x ?? 40;
    const y = pos[n.id]?.y ?? 40;
    cells.push(
      `<mxCell id="n${i}" value="${esc(n.label || n.id)}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${W}" height="${H}" as="geometry"/></mxCell>`
    );
  });
  const idx = Object.fromEntries(nodes.map((n, i) => [n.id, `n${i}`]));
  edges.forEach((e, i) => {
    cells.push(
      `<mxCell id="e${i}" value="${esc(e.label ?? '')}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;" edge="1" parent="1" source="${idx[e.from]}" target="${idx[e.to]}"><mxGeometry relative="1" as="geometry"/></mxCell>`
    );
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="my-ai-factory" version="24.0.0">
  <diagram id="diagram-1" name="${esc(name)}">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${cells.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}

/** Type guard for the diagram payload stored in project_documents.content_json. */
export function isDiagramDoc(v: any): v is DiagramDoc {
  return !!v && typeof v === 'object' && typeof v.mermaid === 'string' && Array.isArray(v.nodes);
}
