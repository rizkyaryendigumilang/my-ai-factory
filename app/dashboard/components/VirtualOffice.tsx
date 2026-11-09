'use client';

import { useEffect, useRef } from 'react';
import type { AgentRole } from '@/types';
import { ROLE_ORDER, type OfficeState } from '@/lib/activity';

/**
 * 2D Software House Virtual Office canvas (based on eliautobot/my-virtual-office).
 * Characters are drawn procedurally on an HTML5 canvas.
 * Their behaviour mirrors the real agent run: the running agent types at its desk;
 * an agent handing work over walks to the central meeting table to discuss.
 */

const TILE = 32;
const COLS = 16;
const ROWS = 10;
const W = COLS * TILE;
const H = ROWS * TILE;
const PX = 3;

export const CAST: Record<AgentRole, { name: string; shirt: string; hair: string; desk: [number, number] }> = {
  'agent-5-ux': { name: 'Stitch', shirt: '#38bdf8', hair: '#4b2e1e', desk: [2, 2] },
  'intelligence-risk': { name: 'Scout', shirt: '#14b8a6', hair: '#111827', desk: [7, 2] },
  'agent-1-pm': { name: 'PM', shirt: '#10b981', hair: '#b45309', desk: [12, 2] },
  'agent-4-analyst': { name: 'Analyst', shirt: '#f59e0b', hair: '#1f2937', desk: [2, 7] },
  'tech-stack-security': { name: 'Security', shirt: '#ef4444', hair: '#6b7280', desk: [7, 7] },
  'agent-coder': { name: 'Coder', shirt: '#a855f7', hair: '#0f172a', desk: [12, 7] },
};

interface Actor {
  x: number;
  y: number;
  facing: 1 | -1;
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  feetY: number,
  c: (typeof CAST)[AgentRole],
  mode: 'walk' | 'sit' | 'type',
  t: number
) {
  const px = (dx: number, dy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(cx + dx * PX), Math.round(feetY + dy * PX), w * PX, h * PX);
  };
  const step = mode === 'walk' ? Math.floor(t / 6) % 2 : 0;
  const bob = mode === 'type' ? Math.floor(t / 8) % 2 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(Math.round(cx - 4 * PX), Math.round(feetY - 1), 8 * PX, 3);
  px(-3, -4, 2, 4, '#1e293b');
  px(1, -4, 2, 4 - step, '#1e293b');
  px(-3, -9 + bob, 6, 5, c.shirt);
  if (mode === 'type') {
    px(-4, -8 + bob, 1, 3, c.shirt);
    px(3, -8 + bob, 1, 3, c.shirt);
  } else {
    px(-4, -8 + (step ? 1 : 0), 1, 4, c.shirt);
    px(3, -8 + (step ? 0 : 1), 1, 4, c.shirt);
  }
  px(-3, -14 + bob, 6, 5, '#f1c9a5');
  px(-3, -15 + bob, 6, 2, c.hair);
  px(-2, -12 + bob, 1, 1, '#111827');
  px(1, -12 + bob, 1, 1, '#111827');
}

export default function VirtualOffice({
  activity,
  className = '',
}: {
  activity?: Partial<Record<AgentRole, OfficeState>>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activityRef = useRef(activity);
  activityRef.current = activity;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;

    const actors = Object.fromEntries(
      ROLE_ORDER.map((r) => [
        r,
        { x: CAST[r].desk[0] * TILE + 16, y: CAST[r].desk[1] * TILE + 52, facing: 1 } as Actor,
      ])
    ) as Record<AgentRole, Actor>;

    let raf = 0;
    let t = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const frame = () => {
      t++;
      const act = activityRef.current ?? {};

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          ctx.fillStyle = (r + c) % 2 ? '#0e131f' : '#121826';
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
        }
      }
      ctx.fillStyle = '#090c14';
      ctx.fillRect(0, 0, W, 26);
      ctx.fillStyle = '#1e2638';
      ctx.fillRect(0, 26, W, 2);

      // Central meeting table (Software House sync)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(7 * TILE - 8, 4 * TILE + 6, 2 * TILE + 16, TILE + 8);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(7 * TILE - 8, 4 * TILE + 6, 2 * TILE + 16, 3);

      const discussers = ROLE_ORDER.filter((r) => act[r] === 'discussing');
      for (const role of ROLE_ORDER) {
        const [dx, dy] = CAST[role].desk;
        const x = dx * TILE;
        const y = dy * TILE;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - 14, y + 4, TILE + 28, 26);
        ctx.fillStyle = '#090c14';
        ctx.fillRect(x + 2, y - 14, 28, 20);
        const typing = act[role] === 'typing';
        ctx.fillStyle = typing ? (Math.floor(t / 10) % 2 ? '#f59e0b' : '#fbbf24') : '#1e3a5f';
        ctx.fillRect(x + 5, y - 11, 22, 14);
        if (typing) {
          ctx.fillStyle = '#090c14';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(x + 8, y - 8 + i * 4, 6 + (((t / 12 + i * 5) % 12) | 0), 2);
          }
        }
      }

      const order = [...ROLE_ORDER].sort((a, b) => actors[a].y - actors[b].y);
      for (const role of order) {
        const a = actors[role];
        const state = act[role] ?? 'idle';
        const [dx, dy] = CAST[role].desk;
        let tx = dx * TILE + 16;
        let ty = dy * TILE + 52;
        if (state === 'discussing') {
          const slot = discussers.indexOf(role);
          tx = slot % 2 === 0 ? 6 * TILE + 8 : 10 * TILE - 8;
          ty = 5 * TILE + 44 + (slot > 1 ? 20 : 0);
        }
        const dxp = tx - a.x;
        const dyp = ty - a.y;
        const dist = Math.hypot(dxp, dyp);
        const walking = dist > 2 && !reduce;
        if (walking) {
          const sp = Math.min(dist, 1.6);
          a.x += (dxp / dist) * sp;
          a.y += (dyp / dist) * sp;
          if (Math.abs(dxp) > 1) a.facing = dxp > 0 ? 1 : -1;
        } else if (reduce) {
          a.x = tx;
          a.y = ty;
        }

        const mode = walking ? 'walk' : state === 'typing' ? 'type' : 'sit';
        drawSprite(ctx, a.x, a.y, CAST[role], mode, t);

        ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = state === 'typing' ? '#fbbf24' : '#e2e8f0';
        ctx.fillText(CAST[role].name, a.x, a.y + 13);

        if (state === 'discussing' && !walking) {
          const bx = a.x - 14;
          const by = a.y - 62;
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(bx, by, 28, 14);
          ctx.fillRect(bx + 12, by + 14, 4, 4);
          ctx.fillStyle = '#090c14';
          const dots = 1 + (Math.floor(t / 15) % 3);
          for (let i = 0; i < dots; i++) ctx.fillRect(bx + 6 + i * 7, by + 6, 3, 3);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const typing = ROLE_ORDER.filter((r) => activity?.[r] === 'typing').map((r) => CAST[r].name);
  const talking = ROLE_ORDER.filter((r) => activity?.[r] === 'discussing').map((r) => CAST[r].name);

  return (
    <div className={`flex flex-col rounded-md border border-border bg-[#090c14] ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 text-xs text-foreground border-b border-border">
        <span className="font-semibold">Software House Virtual Office</span>
        <span className="text-muted-foreground">
          {typing.length ? `${typing.join(', ')} sedang merakit` : 'Semua stasiun siaga'}
          {talking.length ? ` — ${talking.join(' & ')} rapat meja tengah` : ''}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        role="img"
        aria-label="Software House Virtual Office: 6 divisi agen AI bekerja di meja masing-masing dan berdiskusi di meja tengah"
        className="w-full h-auto block rounded-b-md"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
