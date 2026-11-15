import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { getTelemetry } from '@/lib/telemetry';

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
      let lastTelemetryUpdated = '';
      let lastProjUpdated = '';

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
        lastProjUpdated = initial.project.updated || '';
        send('state', initial);

        const initialTelem = getTelemetry(id);
        lastTelemetryUpdated = initialTelem.lastUpdated;
        send('telemetry', initialTelem);

        // shortcut: jika proyek sudah berstatus selesai/gagal, tidak perlu memutar interval polling disk
        if (initial.project.status === 'completed' || initial.project.status === 'failed') {
          send('done', { status: initial.project.status });
          controller.close();
          return;
        }
      }

      // Hardware-friendly cadence: 1500ms with smart metadata checking before querying full state
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const proj = await store.getProject(id);
          if (!proj) {
            clearInterval(interval);
            controller.close();
            return;
          }

          const currentTelem = getTelemetry(id);
          if (currentTelem.lastUpdated !== lastTelemetryUpdated) {
            lastTelemetryUpdated = currentTelem.lastUpdated;
            send('telemetry', currentTelem);
          }

          // Smart hardware check: only read full files/docs/logs from disk if project updated timestamp changed
          if (proj.updated !== lastProjUpdated) {
            lastProjUpdated = proj.updated;
            const current = await store.getProjectState(id);
            if (current) {
              if (current.logs.length !== lastLogCount || current.files.length !== lastFileCount) {
                lastLogCount = current.logs.length;
                lastFileCount = current.files.length;
                send('update', {
                  logs: current.logs,
                  status: current.project.status,
                  filesCount: current.files.length,
                  documentsCount: current.documents.length,
                });
              }
            }
          } else {
            // Heartbeat
            controller.enqueue(encoder.encode(': ping\n\n'));
          }

          if (proj.status === 'completed' || proj.status === 'failed') {
            send('done', { status: proj.status });
            clearInterval(interval);
            setTimeout(() => {
              try { controller.close(); } catch {}
            }, 1000);
          }
        } catch {
          clearInterval(interval);
          try { controller.close(); } catch {}
        }
      }, 1500);

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
