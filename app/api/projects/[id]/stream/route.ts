import { NextResponse } from 'next/server';
import * as store from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await store.getOwnedProject(id);
  if (!project) {
    return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      let lastLogCount = 0;
      let lastFileCount = 0;

      const send = (event: string, data: any) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Initial state
      const initial = await store.getProjectState(id);
      if (initial) {
        lastLogCount = initial.logs.length;
        lastFileCount = initial.files.length;
        send('state', initial);
      }

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const current = await store.getProjectState(id);
          if (!current) {
            clearInterval(interval);
            controller.close();
            return;
          }

          if (current.logs.length !== lastLogCount || current.files.length !== lastFileCount) {
            lastLogCount = current.logs.length;
            lastFileCount = current.files.length;
            send('update', {
              logs: current.logs,
              status: current.project.status,
              filesCount: current.files.length,
              documentsCount: current.documents.length,
            });
          } else {
            // Heartbeat
            controller.enqueue(encoder.encode(': ping\n\n'));
          }

          if (current.project.status === 'completed' || current.project.status === 'failed') {
            send('done', { status: current.project.status });
            clearInterval(interval);
            setTimeout(() => {
              try { controller.close(); } catch {}
            }, 1000);
          }
        } catch {
          clearInterval(interval);
          try { controller.close(); } catch {}
        }
      }, 800);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
