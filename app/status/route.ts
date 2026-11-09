import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { ROLE_ORDER, roleStatuses, officeActivity } from '@/lib/activity';
import { getDivisionConfigs } from '@/lib/division-config';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('project');

  let targetId = projectId;
  if (!targetId) {
    const list = await store.listProjects();
    const running = list.find((p) => p.status === 'running');
    targetId = running ? running.id : list[0]?.id;
  }

  const logs = targetId ? await store.listLogs(targetId) : [];
  const act = officeActivity(logs);
  const statuses = roleStatuses(logs);
  const divisions = getDivisionConfigs();

  const statusMap: Record<
    string,
    { state: string; task: string; thought?: string; source?: string; agentName?: string }
  > = {};

  for (const role of ROLE_ORDER) {
    const s = act[role] ?? 'idle';
    let state = 'idle';
    let task = '';
    const div = divisions[role];

    if (s === 'typing') {
      state = 'working';
      const lastLog = [...logs].reverse().find((l) => l.agent === role && l.status === 'running');
      task = lastLog?.message || 'Sedang bekerja merakit spesifikasi...';
    } else if (s === 'discussing') {
      state = 'meeting';
      task = 'Diskusi serah-terima artefak di meja rapat...';
    } else if (statuses[role] === 'completed') {
      state = 'idle';
      task = 'Tugas selesai, standby';
    }

    const sourceLabel =
      div?.source === 'hermes-vps'
        ? 'Hermes VPS (8444)'
        : div?.source === 'router9-vps'
        ? '9Router Gateway (8443)'
        : div?.source === 'custom-vps'
        ? 'Custom VPS'
        : 'Native Factory';

    statusMap[role] = {
      state,
      task: task ? `${task} [${sourceLabel}]` : `Siaga [${sourceLabel}]`,
      thought: `${div?.agentName ?? role}: ${div?.modelOrProfile ?? 'aktif'} via ${sourceLabel}`,
      source: div?.source,
      agentName: div?.agentName,
    };
  }

  statusMap['agent-hermes'] = {
    state: 'working',
    task: 'Hermes VPS aktif (43.156.236.102:8444)',
    thought: 'Hermes Autonomous Telemetry Bridge aktif di port 8444',
    source: 'hermes-vps',
    agentName: 'Hermes Orchestrator',
  };

  const isOfficeActive = Object.values(act).some((s) => s === 'typing' || s === 'discussing');
  const ceoEntry = {
    state: isOfficeActive ? 'working' : 'idle',
    task: isOfficeActive
      ? 'CEO: Memimpin & mengawasi pipeline produksi software house'
      : 'Chief Executive Officer (CEO) — Siaga memantau operasional kantor',
    thought: isOfficeActive
      ? 'Memastikan delivery artefak sesuai target kualitas dan arsitektur kode tepat waktu'
      : 'Kantor software house beroperasi optimal. Siap mengeksekusi proyek baru.',
    source: 'executive',
    agentName: 'kiky',
  };

  statusMap['agent-ceo'] = ceoEntry;
  statusMap['kiky'] = ceoEntry;

  return NextResponse.json(statusMap);
}
