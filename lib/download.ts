import type { DiagramDoc } from '@/types';

/** Client-side download helpers (.drawio text, SVG/PNG/JPG rasterisation). */

export function downloadBlob(filename: string, data: Blob | string, type = 'text/plain') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function svgSize(svg: string): { w: number; h: number } {
  const vb = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/.exec(svg);
  if (vb) return { w: Math.ceil(+vb[1]), h: Math.ceil(+vb[2]) };
  const w = /width="([\d.]+)/.exec(svg);
  const h = /height="([\d.]+)/.exec(svg);
  return { w: Math.ceil(+(w?.[1] ?? 800)), h: Math.ceil(+(h?.[1] ?? 600)) };
}

/** Rasterise an SVG string. Mermaid must be configured with htmlLabels:false so the canvas is not tainted. */
export async function svgToImageBlob(svg: string, format: 'png' | 'jpeg', scale = 2): Promise<Blob> {
  const { w, h } = svgSize(svg);
  // Ensure explicit pixel dimensions: browsers need them to decode an <img> from SVG.
  const sized = svg.replace(/<svg([^>]*?)>/, (_m, attrs: string) => {
    const clean = attrs.replace(/\s(width|height)="[^"]*"/g, '').replace(/style="[^"]*"/, '');
    return `<svg${clean} width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
  });
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('Gagal memuat SVG'));
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; // PNG too: diagrams are unreadable on transparent dark backgrounds
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Gagal membuat gambar'))), `image/${format}`, 0.92)
  );
}

/** Fallback Mermaid flowchart built from nodes/edges, used when the AI's Mermaid source does not parse. */
export function fallbackMermaid(d: DiagramDoc): string {
  const id = (s: string) => 'n' + s.replace(/[^a-zA-Z0-9]/g, '_');
  const label = (s: string) => s.replace(/["\[\]()]/g, ' ');
  const lines = ['flowchart TD'];
  for (const n of d.nodes) lines.push(`  ${id(n.id)}["${label(n.label)}"]`);
  for (const e of d.edges) lines.push(`  ${id(e.from)} -->${e.label ? `|${label(e.label)}|` : ''} ${id(e.to)}`);
  return lines.join('\n');
}

/** Downscale a user-selected image to a JPEG data URL (keeps PocketBase JSON payloads small). */
export async function fileToDataUrl(file: File, maxSide = 1024, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
