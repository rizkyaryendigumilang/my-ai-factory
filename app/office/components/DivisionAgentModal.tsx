'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Cpu,
  ExternalLink,
  Layers,
  RotateCcw,
  Server,
  SlidersHorizontal,
  Wifi,
  X,
} from 'lucide-react';
import type { AgentRole } from '@/types';
import {
  DEFAULT_DIVISIONS,
  PROVIDER_OPTIONS,
  type AgentSource,
  type DivisionAgentConfig,
} from '@/lib/division-types';

interface DivisionAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const ROLE_LIST: AgentRole[] = [
  'agent-1-pm',
  'agent-5-ux',
  'intelligence-risk',
  'agent-4-analyst',
  'tech-stack-security',
  'agent-coder',
];

export default function DivisionAgentModal({
  isOpen,
  onClose,
  onSaved,
}: DivisionAgentModalProps) {
  const [configs, setConfigs] = useState<Record<AgentRole, DivisionAgentConfig>>(DEFAULT_DIVISIONS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [pingStatus, setPingStatus] = useState<{
    ok: boolean;
    latencyMs?: number;
    message?: string;
  } | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/divisions');
      if (res.ok) {
        const data = await res.json();
        if (data.divisions) {
          setConfigs(data.divisions);
        }
      }
    } catch {
      // keep fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchConfigs();
      setSaveSuccess(false);
      setPingStatus(null);
    }
  }, [isOpen, fetchConfigs]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleProviderChange = (role: AgentRole, source: AgentSource) => {
    setConfigs((prev) => {
      const current = prev[role];
      const provider = PROVIDER_OPTIONS[source];
      const firstPreset = provider.presets[0]?.id ?? 'default';

      let endpointUrl = provider.defaultUrl;
      if (source === 'hermes-vps') {
        endpointUrl = `https://43.156.236.102:8444/?profile=${firstPreset}`;
      }

      return {
        ...prev,
        [role]: {
          ...current,
          source,
          modelOrProfile: firstPreset,
          endpointUrl,
          agentName: `${provider.label.split(' ')[0]} ${current.defaultName}`,
        },
      };
    });
  };

  const handleModelChange = (role: AgentRole, modelOrProfile: string) => {
    setConfigs((prev) => {
      const current = prev[role];
      let endpointUrl = current.endpointUrl;

      if (current.source === 'hermes-vps') {
        endpointUrl = `https://43.156.236.102:8444/?profile=${encodeURIComponent(modelOrProfile)}`;
      }

      return {
        ...prev,
        [role]: {
          ...current,
          modelOrProfile,
          endpointUrl,
        },
      };
    });
  };

  const handleAgentNameChange = (role: AgentRole, agentName: string) => {
    setConfigs((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        agentName,
      },
    }));
  };

  const applyPresetAllHermes = () => {
    setConfigs((prev) => {
      const next = { ...prev };
      for (const role of ROLE_LIST) {
        const item = next[role];
        const profileMap: Record<AgentRole, string> = {
          'agent-1-pm': 'hermes-pm-v1',
          'agent-5-ux': 'default',
          'intelligence-risk': 'hermes-scout',
          'agent-4-analyst': 'hermes-analyst',
          'tech-stack-security': 'hermes-security',
          'agent-coder': 'hermes-coder',
        };
        const prof = profileMap[role] || 'default';
        next[role] = {
          ...item,
          source: 'hermes-vps',
          modelOrProfile: prof,
          endpointUrl: `https://43.156.236.102:8444/?profile=${prof}`,
          agentName: `Hermes ${item.defaultName}`,
        };
      }
      return next;
    });
  };

  const applyPresetAll9Router = () => {
    setConfigs((prev) => {
      const next = { ...prev };
      for (const role of ROLE_LIST) {
        const item = next[role];
        const modelMap: Record<AgentRole, string> = {
          'agent-1-pm': 'claude-3-5-sonnet',
          'agent-5-ux': 'gemini-1.5-pro',
          'intelligence-risk': 'claude-3-5-sonnet',
          'agent-4-analyst': 'claude-3-5-sonnet',
          'tech-stack-security': 'claude-3-5-sonnet',
          'agent-coder': 'deepseek-coder-v2',
        };
        const model = modelMap[role] || 'claude-3-5-sonnet';
        next[role] = {
          ...item,
          source: 'router9-vps',
          modelOrProfile: model,
          endpointUrl: 'https://43.156.236.102:8443/',
          agentName: `9Router ${item.defaultName}`,
        };
      }
      return next;
    });
  };

  const applyPresetDefault = () => {
    setConfigs(DEFAULT_DIVISIONS);
  };

  const testVPSConnection = async () => {
    setTestingPing(true);
    setPingStatus(null);
    try {
      const start = Date.now();
      const res = await fetch('/api/hermes/test');
      const elapsed = Date.now() - start;
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setPingStatus({
          ok: true,
          latencyMs: elapsed,
          message: `VPS 43.156.236.102 terhubung (${elapsed}ms). Port 8444 & 8443 aktif.`,
        });
      } else {
        setPingStatus({
          ok: false,
          latencyMs: elapsed,
          message: data.message || 'Gagal tersambung ke endpoint VPS.',
        });
      }
    } catch {
      setPingStatus({
        ok: false,
        message: 'Tidak dapat menjangkau server VPS gateway.',
      });
    } finally {
      setTestingPing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/divisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ divisions: configs }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        if (onSaved) onSaved();
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-scrim-in"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-lg border border-white/10 bg-card/95 shadow-2xl backdrop-blur-xl animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Pilih & Konfigurasi Agen VPS Divisi Kantor
              </h2>
              <p className="text-xs text-muted-foreground">
                Tentukan penyedia AI dan profil model dari VPS (Hermes 8444 / 9Router 8443 / Native) untuk setiap divisi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Tutup jendela pengaturan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/40 px-5 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-muted-foreground">Preset Cepat:</span>
            <button
              type="button"
              onClick={applyPresetDefault}
              className="rounded-sm border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground transition-[transform,background-color,border-color,color] duration-150 ease-out hover:border-primary active:scale-[0.98]"
            >
              Rekomendasi Software House
            </button>
            <button
              type="button"
              onClick={applyPresetAllHermes}
              className="rounded-sm border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground transition-[transform,background-color,border-color,color] duration-150 ease-out hover:border-primary active:scale-[0.98]"
            >
              Semua Hermes VPS (8444)
            </button>
            <button
              type="button"
              onClick={applyPresetAll9Router}
              className="rounded-sm border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground transition-[transform,background-color,border-color,color] duration-150 ease-out hover:border-primary active:scale-[0.98]"
            >
              Semua 9Router Gateway (8443)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={testVPSConnection}
              disabled={testingPing}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition-[transform,background-color,border-color,color] duration-150 ease-out hover:border-primary disabled:opacity-60 active:scale-[0.98]"
            >
              <Wifi className="h-3 w-3 text-primary" />
              <span>{testingPing ? 'Memeriksa VPS…' : 'Tes Koneksi VPS'}</span>
            </button>
          </div>
        </div>

        {/* Connectivity Status Banner */}
        {pingStatus && (
          <div
            className={`flex shrink-0 items-center justify-between border-b px-5 py-2 text-xs ${
              pingStatus.ok
                ? 'border-border bg-card text-foreground'
                : 'border-destructive/40 bg-destructive/10 text-destructive'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-sm ${
                  pingStatus.ok ? 'bg-primary' : 'bg-destructive'
                }`}
              />
              <span>{pingStatus.message}</span>
            </div>
            {pingStatus.latencyMs !== undefined && (
              <span className="text-xs text-muted-foreground">
                {pingStatus.latencyMs} ms
              </span>
            )}
          </div>
        )}

        {/* Division Cards List */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Memuat konfigurasi divisi kantor…
            </div>
          ) : (
            <div className="grid gap-3.5 md:grid-cols-2">
              {ROLE_LIST.map((role, idx) => {
                const conf = configs[role] ?? DEFAULT_DIVISIONS[role];
                const providerInfo = PROVIDER_OPTIONS[conf.source];
                const currentPresets = providerInfo.presets;

                return (
                  <div
                    key={role}
                    className="flex flex-col justify-between rounded-sm border border-border bg-card p-3.5 transition-colors hover:border-border/80"
                  >
                    <div>
                      {/* Top Role Header */}
                      <div className="mb-2 flex items-center justify-between gap-2 border-b border-border pb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-secondary text-[11px] font-bold text-foreground">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-semibold text-xs text-foreground">
                              {conf.divisionTitle}
                            </span>
                            <div className="text-[10px] text-muted-foreground">
                              Inisial Kantor: <strong className="text-foreground">{conf.defaultName}</strong>
                            </div>
                          </div>
                        </div>

                        <span className="rounded-sm border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {conf.source === 'hermes-vps'
                            ? 'HERMES :8444'
                            : conf.source === 'router9-vps'
                            ? '9ROUTER :8443'
                            : conf.source === 'custom-vps'
                            ? 'CUSTOM'
                            : 'NATIVE'}
                        </span>
                      </div>

                      <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                        {conf.description}
                      </p>

                      {/* Source Provider Selector */}
                      <div className="mb-2.5">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Penyedia AI / Sumber Agen
                        </label>
                        <select
                          value={conf.source}
                          onChange={(e) =>
                            handleProviderChange(role, e.target.value as AgentSource)
                          }
                          className="h-8 w-full rounded-sm border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="hermes-vps">Hermes VPS Agent (Port 8444)</option>
                          <option value="router9-vps">9Router AI Gateway (Port 8443)</option>
                          <option value="native">Native AI Factory (Internal)</option>
                          <option value="custom-vps">Kustom VPS Endpoint</option>
                        </select>
                      </div>

                      {/* Model / Profile Selector */}
                      <div className="mb-2.5">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Model / Profil VPS
                        </label>
                        <div className="space-y-1.5">
                          <select
                            value={
                              currentPresets.some((p) => p.id === conf.modelOrProfile)
                                ? conf.modelOrProfile
                                : 'custom'
                            }
                            onChange={(e) => {
                              if (e.target.value !== 'custom') {
                                handleModelChange(role, e.target.value);
                              }
                            }}
                            className="h-8 w-full rounded-sm border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {currentPresets.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label} ({p.id})
                              </option>
                            ))}
                            <option value="custom">Kustom Model / Profil ID…</option>
                          </select>

                          {/* Custom input if needed or selected */}
                          {(!currentPresets.some((p) => p.id === conf.modelOrProfile) ||
                            conf.source === 'custom-vps') && (
                            <input
                              type="text"
                              value={conf.modelOrProfile}
                              onChange={(e) => handleModelChange(role, e.target.value)}
                              placeholder="Masukkan nama profil atau model ID..."
                              className="h-7 w-full rounded-sm border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          )}
                        </div>
                      </div>

                      {/* Agent Label in Office */}
                      <div className="mb-2.5">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Label Nama Agen di Kantor
                        </label>
                        <input
                          type="text"
                          value={conf.agentName}
                          onChange={(e) => handleAgentNameChange(role, e.target.value)}
                          placeholder="Nama agen di status & kantor..."
                          className="h-8 w-full rounded-sm border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Bottom URL preview & direct link */}
                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[10px]">
                      <span className="truncate text-xs text-muted-foreground max-w-[240px]">
                        {conf.endpointUrl}
                      </span>
                      {conf.endpointUrl.startsWith('http') && (
                        <a
                          href={conf.endpointUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
                          title="Uji buka endpoint langsung di tab baru"
                        >
                          <span>Buka</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-card px-5 py-3">
          <div className="flex items-center gap-2 text-xs">
            {saveSuccess && (
              <span className="inline-flex items-center gap-1 font-medium text-primary">
                <Check className="h-3.5 w-3.5" />
                Konfigurasi divisi berhasil disimpan & disinkronisasi ke kantor!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-[transform,background-color,border-color,color] duration-150 ease-out hover:border-primary hover:text-foreground active:scale-[0.98]"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-[transform,background-color,border-color,color] duration-150 ease-out hover:bg-primary/90 disabled:opacity-60 active:scale-[0.98]"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{saving ? 'Menyimpan…' : 'Simpan & Terapkan ke Kantor'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
