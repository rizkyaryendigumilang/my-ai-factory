'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  Check,
  Cpu,
  Database,
  ExternalLink,
  Github,
  Key,
  Layers,
  Loader2,
  Lock,
  Mic,
  Palette,
  RefreshCw,
  Server,
  Settings,
  Shield,
  Sliders,
  Volume2,
  X,
} from 'lucide-react';
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  type FactorySettings,
  DEFAULT_FACTORY_SETTINGS,
} from '@/types/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: FactorySettings) => void;
}

type SettingsTab = 'ai' | 'vps' | 'github' | 'orchestration' | 'appearance';

export default function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FactorySettings>(DEFAULT_FACTORY_SETTINGS);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Test states
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiResult, setGeminiResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [testingHermes, setTestingHermes] = useState(false);
  const [hermesResult, setHermesResult] = useState<{ ok: boolean; msg: string; latency?: number } | null>(null);

  const [testingGithub, setTestingGithub] = useState(false);
  const [githubResult, setGithubResult] = useState<{ ok: boolean; msg: string; user?: any } | null>(null);

  const [testingPb, setTestingPb] = useState(false);
  const [pbResult, setPbResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Load settings on open
  useEffect(() => {
    if (!isOpen) {
      setStatusMessage(null);
      setGeminiResult(null);
      setHermesResult(null);
      setGithubResult(null);
      setPbResult(null);
      return;
    }

    setLoading(true);
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.settings) {
          setSettings(data.settings);
        }
      })
      .catch((err) => {
        setStatusMessage({ type: 'error', text: 'Gagal memuat pengaturan: ' + err.message });
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Gagal menyimpan pengaturan');
      }
      setSettings(data.settings);
      setStatusMessage({ type: 'success', text: 'Pengaturan pabrik AI berhasil disimpan!' });
      if (onSaved) onSaved(data.settings);
      setTimeout(() => {
        setStatusMessage(null);
      }, 3500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Kembalikan semua pengaturan ke konfigurasi default rekomendasi Kiky?')) {
      setSettings({
        ...DEFAULT_FACTORY_SETTINGS,
        ai: {
          ...DEFAULT_FACTORY_SETTINGS.ai,
          geminiApiKey: settings.ai.geminiApiKey, // keep existing key
        },
        github: {
          ...DEFAULT_FACTORY_SETTINGS.github,
          githubToken: settings.github.githubToken,
        },
      });
      setStatusMessage({ type: 'info', text: 'Formulir diisi dengan konfigurasi default. Tekan Simpan untuk menerapkan.' });
    }
  };

  // Test Actions
  const runTestGemini = async () => {
    setTestingGemini(true);
    setGeminiResult(null);
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'gemini',
          apiKey: settings.ai.geminiApiKey,
          model: settings.ai.primaryModel,
        }),
      });
      const data = await res.json();
      setGeminiResult({ ok: data.ok, msg: data.message });
    } catch (err: any) {
      setGeminiResult({ ok: false, msg: err.message });
    } finally {
      setTestingGemini(false);
    }
  };

  const runTestHermes = async () => {
    setTestingHermes(true);
    setHermesResult(null);
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hermes',
          endpoint: settings.vps.hermesEndpoint,
        }),
      });
      const data = await res.json();
      setHermesResult({ ok: data.ok, msg: data.message, latency: data.latencyMs });
    } catch (err: any) {
      setHermesResult({ ok: false, msg: err.message });
    } finally {
      setTestingHermes(false);
    }
  };

  const runTestGithub = async () => {
    setTestingGithub(true);
    setGithubResult(null);
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'github',
          token: settings.github.githubToken,
        }),
      });
      const data = await res.json();
      setGithubResult({ ok: data.ok, msg: data.message, user: data.user });
    } catch (err: any) {
      setGithubResult({ ok: false, msg: err.message });
    } finally {
      setTestingGithub(false);
    }
  };

  const runTestPb = async () => {
    setTestingPb(true);
    setPbResult(null);
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pocketbase',
          url: settings.vps.pocketbaseUrl,
        }),
      });
      const data = await res.json();
      setPbResult({ ok: data.ok, msg: data.message });
    } catch (err: any) {
      setPbResult({ ok: false, msg: err.message });
    } finally {
      setTestingPb(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl" className="overflow-hidden">
      <DialogHeader
        title={
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary/20 text-primary">
              <Settings className="h-4 w-4" />
            </span>
            <span className="font-semibold text-foreground">Pengaturan Pabrik & Integrasi Sistem</span>
          </div>
        }
        description="Kelola koneksi model AI, endpoint VPS Hermes, GitHub PAT, mode orkestrasi Kiky, dan preferensi tampilan."
        onClose={onClose}
      />

      <DialogBody className="p-0">
        <div className="flex h-[520px] flex-col md:flex-row">
          {/* Left Sidebar Navigation */}
          <aside className="w-full shrink-0 border-b border-border bg-muted/20 p-2 md:w-56 md:border-b-0 md:border-r">
            <nav className="flex flex-row overflow-x-auto gap-1.5 md:flex-col" aria-label="Kategori Pengaturan">
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`flex min-h-[44px] md:min-h-[38px] w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-all duration-100 ease-out active:scale-[0.97] shrink-0 md:shrink ${
                  activeTab === 'ai'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Cpu className="h-4 w-4 shrink-0" />
                <span className="truncate">AI & Model Gateway</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vps')}
                className={`flex min-h-[44px] md:min-h-[38px] w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-all duration-100 ease-out active:scale-[0.97] shrink-0 md:shrink ${
                  activeTab === 'vps'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Server className="h-4 w-4 shrink-0" />
                <span className="truncate">VPS & Infrastruktur</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('github')}
                className={`flex min-h-[44px] md:min-h-[38px] w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-all duration-100 ease-out active:scale-[0.97] shrink-0 md:shrink ${
                  activeTab === 'github'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Github className="h-4 w-4 shrink-0" />
                <span className="truncate">GitHub & Repositori</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orchestration')}
                className={`flex min-h-[44px] md:min-h-[38px] w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-all duration-100 ease-out active:scale-[0.97] shrink-0 md:shrink ${
                  activeTab === 'orchestration'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Sliders className="h-4 w-4 shrink-0" />
                <span className="truncate">Orkestrasi & Gates</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('appearance')}
                className={`flex min-h-[44px] md:min-h-[38px] w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-all duration-100 ease-out active:scale-[0.97] shrink-0 md:shrink ${
                  activeTab === 'appearance'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Palette className="h-4 w-4 shrink-0" />
                <span className="truncate">Tampilan & Audio</span>
              </button>
            </nav>
          </aside>

          {/* Right Content View */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-5">
            {loading ? (
              <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Memuat konfigurasi...</span>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Status Message Banner */}
                {statusMessage && (
                  <div
                    className={`rounded-md p-3 text-xs flex items-center justify-between ${
                      statusMessage.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : statusMessage.type === 'error'
                        ? 'bg-destructive/10 border border-destructive/30 text-destructive'
                        : 'bg-primary/10 border border-primary/30 text-primary'
                    }`}
                  >
                    <span>{statusMessage.text}</span>
                    <button type="button" onClick={() => setStatusMessage(null)}>
                      <X className="h-3.5 w-3.5 opacity-70 hover:opacity-100" />
                    </button>
                  </div>
                )}

                {/* TAB 1: AI & LLM GATEWAY */}
                {activeTab === 'ai' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Cpu className="h-4 w-4 text-primary" />
                        Google Gemini API & Model Routing
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Konfigurasikan kunci API Google Gemini dan cascade model cadangan saat beban tinggi.
                      </p>
                    </div>

                    <div className="space-y-3 rounded-lg border border-border bg-background/50 p-3.5">
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-foreground flex items-center gap-1">
                            <Key className="h-3 w-3 text-primary" /> Gemini API Key
                          </label>
                          {settings.ai.hasGeminiKey && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                              Kunci Aktif Tersimpan
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex gap-2">
                          <input
                            type="password"
                            placeholder="AIzaSy..."
                            value={settings.ai.geminiApiKey}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                ai: { ...settings.ai, geminiApiKey: e.target.value },
                              })
                            }
                            className="h-8 flex-1 rounded border border-input bg-background px-2.5 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={runTestGemini}
                            disabled={testingGemini}
                            className="h-8 shrink-0 text-xs"
                          >
                            {testingGemini ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Activity className="h-3.5 w-3.5 text-emerald-400 mr-1" />
                            )}
                            Tes Koneksi
                          </Button>
                        </div>
                        {geminiResult && (
                          <p
                            className={`mt-1.5 text-[11px] ${
                              geminiResult.ok ? 'text-emerald-400' : 'text-destructive'
                            }`}
                          >
                            {geminiResult.msg}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium text-foreground">Model Utama</label>
                          <select
                            value={settings.ai.primaryModel}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                ai: { ...settings.ai, primaryModel: e.target.value },
                              })
                            }
                            className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs"
                          >
                            <option value="gemini-1.5-flash">gemini-1.5-flash (Cepat & Stabil)</option>
                            <option value="gemini-2.0-flash">gemini-2.0-flash (Next-Gen)</option>
                            <option value="gemini-1.5-pro">gemini-1.5-pro (Penalaran Kompleks)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-foreground">Cadangan (Fallback Models)</label>
                          <input
                            type="text"
                            value={settings.ai.fallbackModels.join(', ')}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                ai: {
                                  ...settings.ai,
                                  fallbackModels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                },
                              })
                            }
                            placeholder="gemini-2.0-flash, gemini-1.5-pro"
                            className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border">
                        <label className="text-xs font-medium text-foreground">
                          9Router VPS Gateway (:8443)
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Endpoint OpenAI/Claude-compatible proxy di VPS untuk model Claude 3.5 Sonnet / DeepSeek R1.
                        </p>
                        <input
                          type="text"
                          value={settings.ai.routerUrl}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              ai: { ...settings.ai, routerUrl: e.target.value },
                            })
                          }
                          className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs font-mono"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <span className="text-xs font-medium text-foreground">Mode Simulasi Offline (Mock Mode)</span>
                          <p className="text-[11px] text-muted-foreground">
                            Gunakan demo konten tanpa memanggil API (hemat kuota / demo offline).
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.ai.mockMode}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              ai: { ...settings.ai, mockMode: e.target.checked },
                            })
                          }
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: VPS & INFRASTRUCTURE */}
                {activeTab === 'vps' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Server className="h-4 w-4 text-primary" />
                        Infrastruktur VPS & Database
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Kelola endpoint agen otonom Hermes (:8444), Open WebUI (:8080), dan persistensi data PocketBase.
                      </p>
                    </div>

                    <div className="space-y-3.5 rounded-lg border border-border bg-background/50 p-3.5">
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-foreground">
                            Hermes Agent VPS URL (:8444)
                          </label>
                          <a
                            href={`${settings.vps.hermesEndpoint}/?profile=default`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <span>Buka Dashboard Hermes</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="mt-1 flex gap-2">
                          <input
                            type="text"
                            value={settings.vps.hermesEndpoint}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                vps: { ...settings.vps, hermesEndpoint: e.target.value },
                              })
                            }
                            className="h-8 flex-1 rounded border border-input bg-background px-2.5 text-xs font-mono"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={runTestHermes}
                            disabled={testingHermes}
                            className="h-8 shrink-0 text-xs"
                          >
                            {testingHermes ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Activity className="h-3.5 w-3.5 text-emerald-400 mr-1" />
                            )}
                            Ping VPS
                          </Button>
                        </div>
                        {hermesResult && (
                          <p
                            className={`mt-1.5 text-[11px] ${
                              hermesResult.ok ? 'text-emerald-400' : 'text-destructive'
                            }`}
                          >
                            {hermesResult.msg}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-foreground">
                          Open WebUI Endpoint (Port 8080 / Root HTTPS)
                        </label>
                        <input
                          type="text"
                          value={settings.vps.openWebUiEndpoint}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              vps: { ...settings.vps, openWebUiEndpoint: e.target.value },
                            })
                          }
                          className="mt-1 h-8 w-full rounded border border-input bg-background px-2.5 text-xs font-mono"
                        />
                      </div>

                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-foreground">
                            Database PocketBase (:8090)
                          </label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Driver: {settings.vps.storeDriver}
                          </span>
                        </div>
                        <div className="mt-1 flex gap-2">
                          <input
                            type="text"
                            value={settings.vps.pocketbaseUrl}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                vps: { ...settings.vps, pocketbaseUrl: e.target.value },
                              })
                            }
                            className="h-8 flex-1 rounded border border-input bg-background px-2.5 text-xs font-mono"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={runTestPb}
                            disabled={testingPb}
                            className="h-8 shrink-0 text-xs"
                          >
                            {testingPb ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Database className="h-3.5 w-3.5 mr-1" />}
                            Cek DB
                          </Button>
                        </div>
                        {pbResult && (
                          <p
                            className={`mt-1.5 text-[11px] ${
                              pbResult.ok ? 'text-emerald-400' : 'text-destructive'
                            }`}
                          >
                            {pbResult.msg}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-foreground">Penyimpanan Database</label>
                        <select
                          value={settings.vps.storeDriver}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              vps: { ...settings.vps, storeDriver: e.target.value as any },
                            })
                          }
                          className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs"
                        >
                          <option value="auto">Otomatis (PocketBase jika aktif, cadangan berkas JSON)</option>
                          <option value="file">Berkas JSON Lokal (.data/factory.json)</option>
                          <option value="pocketbase">PocketBase SQLite Lokal / VPS</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: GITHUB INTEGRATION */}
                {activeTab === 'github' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Github className="h-4 w-4 text-primary" />
                        Integrasi GitHub & Repositori
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Masukkan Personal Access Token (PAT) agar proyek bisa langsung diekspor ke akun GitHub Anda.
                      </p>
                    </div>

                    <div className="space-y-3.5 rounded-lg border border-border bg-background/50 p-3.5">
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-foreground">
                            GitHub Personal Access Token (PAT)
                          </label>
                          {settings.github.hasGithubToken && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                              Token Aktif Tersimpan
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex gap-2">
                          <input
                            type="password"
                            placeholder="ghp_xxxxxxxxxxxx..."
                            value={settings.github.githubToken}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                github: { ...settings.github, githubToken: e.target.value },
                              })
                            }
                            className="h-8 flex-1 rounded border border-input bg-background px-2.5 text-xs font-mono placeholder:text-muted-foreground"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={runTestGithub}
                            disabled={testingGithub}
                            className="h-8 shrink-0 text-xs"
                          >
                            {testingGithub ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-emerald-400 mr-1" />
                            )}
                            Verifikasi
                          </Button>
                        </div>
                        {githubResult && (
                          <div
                            className={`mt-2 flex items-center gap-2 rounded p-2 text-xs ${
                              githubResult.ok
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-destructive/10 text-destructive border border-destructive/20'
                            }`}
                          >
                            {githubResult.user?.avatar_url && (
                              <img
                                src={githubResult.user.avatar_url}
                                alt="Avatar"
                                className="h-6 w-6 rounded-full"
                              />
                            )}
                            <span>{githubResult.msg}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium text-foreground">
                            Default GitHub Owner / Organization
                          </label>
                          <input
                            type="text"
                            placeholder="rizkyaryendigumilang"
                            value={settings.github.defaultOwner}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                github: { ...settings.github, defaultOwner: e.target.value },
                              })
                            }
                            className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-foreground">Default Target Branch</label>
                          <input
                            type="text"
                            placeholder="main"
                            value={settings.github.targetBranch}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                github: { ...settings.github, targetBranch: e.target.value },
                              })
                            }
                            className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div>
                          <span className="text-xs font-medium text-foreground">
                            Auto Push saat Proyek Selesai
                          </span>
                          <p className="text-[11px] text-muted-foreground">
                            Otomatis push kode ke GitHub setelah build dan pengujian QA lolos 100%.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.github.autoPushOnSuccess}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              github: { ...settings.github, autoPushOnSuccess: e.target.checked },
                            })
                          }
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: ORCHESTRATION & GATES */}
                {activeTab === 'orchestration' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Sliders className="h-4 w-4 text-primary" />
                        Kendali Kiky (Persetujuan Tim Agen)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Atur tingkat keterlibatan Anda dalam menyetujui langkah kerja subagen.
                      </p>
                    </div>

                    <div className="space-y-3.5 rounded-lg border border-border bg-background/50 p-3.5">
                      <div>
                        <label className="text-xs font-medium text-foreground">
                          Persetujuan Kerja Agen
                        </label>
                        <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label
                            className={`flex cursor-pointer flex-col rounded-md border p-3 transition-all ${
                              settings.orchestration.kikyApprovalGates === 'strict'
                                ? 'border-primary bg-primary/10 text-foreground'
                                : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-primary" /> Verifikasi Manual (Pilihan Aman)
                              </span>
                              <input
                                type="radio"
                                name="approvalGate"
                                value="strict"
                                checked={settings.orchestration.kikyApprovalGates === 'strict'}
                                onChange={() =>
                                  setSettings({
                                    ...settings,
                                    orchestration: { ...settings.orchestration, kikyApprovalGates: 'strict' },
                                  })
                                }
                                className="sr-only"
                              />
                            </div>
                            <span className="mt-1 text-[11px] leading-relaxed">
                              Setiap pergantian tahap (PM → Desain → Arsitektur → Keamanan → Koding → QA) wajib disetujui sebelum lanjut.
                            </span>
                          </label>

                          <label
                            className={`flex cursor-pointer flex-col rounded-md border p-3 transition-all ${
                              settings.orchestration.kikyApprovalGates === 'autonomous'
                                ? 'border-primary bg-primary/10 text-foreground'
                                : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <Bot className="h-3.5 w-3.5 text-emerald-400" /> Otonom Berkelanjutan
                              </span>
                              <input
                                type="radio"
                                name="approvalGate"
                                value="autonomous"
                                checked={settings.orchestration.kikyApprovalGates === 'autonomous'}
                                onChange={() =>
                                  setSettings({
                                    ...settings,
                                    orchestration: { ...settings.orchestration, kikyApprovalGates: 'autonomous' },
                                  })
                                }
                                className="sr-only"
                              />
                            </div>
                            <span className="mt-1 text-[11px] leading-relaxed">
                              Agen bekerja otomatis tanpa jeda; konfirmasi hanya diminta saat kompilasi akhir dan sebelum deploy.
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border">
                        <label className="text-xs font-medium text-foreground">Tingkat Detail Log Streaming</label>
                        <select
                          value={settings.orchestration.loggingLevel}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              orchestration: { ...settings.orchestration, loggingLevel: e.target.value as any },
                            })
                          }
                          className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs"
                        >
                          <option value="debug">Lengkap / Debug (seluruh event internal dan token mentah)</option>
                          <option value="info">Standar / Info (kemajuan kerja dan status per agen)</option>
                          <option value="warn">Peringatan & Error (hanya kendala dan galat kompilasi)</option>
                          <option value="error">Hanya Error Kritis</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: APPEARANCE & AUDIO */}
                {activeTab === 'appearance' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Palette className="h-4 w-4 text-primary" />
                        Tampilan & Umpan Balik Audio
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sesuaikan efek tembus pandang, kenyamanan gerak antarmuka, dan bahasa input suara.
                      </p>
                    </div>

                    <div className="space-y-3.5 rounded-lg border border-border bg-background/50 p-3.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium text-foreground">
                            Efek Kaca Buram (Frosted Glass)
                          </span>
                          <p className="text-[11px] text-muted-foreground">
                            Efek tembus pandang pada bar navigasi dan dialog. Matikan jika perangkat terasa lambat.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.appearance.frostedGlass}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              appearance: { ...settings.appearance, frostedGlass: e.target.checked },
                            })
                          }
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div>
                          <span className="text-xs font-medium text-foreground">
                            Kurangi Gerakan (Tanpa Animasi Pegas)
                          </span>
                          <p className="text-[11px] text-muted-foreground">
                            Hilangkan transisi animasi agar antarmuka merespons seketika.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.appearance.reducedMotion}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              appearance: { ...settings.appearance, reducedMotion: e.target.checked },
                            })
                          }
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div>
                          <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            <Volume2 className="h-3.5 w-3.5 text-primary" /> Umpan Balik Suara
                          </span>
                          <p className="text-[11px] text-muted-foreground">
                            Bunyikan denting saat agen selesai memproses tugas atau mengoper kerjaan.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.appearance.soundEffects}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              appearance: { ...settings.appearance, soundEffects: e.target.checked },
                            })
                          }
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                      </div>

                      <div className="pt-2 border-t border-border">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Mic className="h-3.5 w-3.5 text-primary" /> Bahasa Dikte Suara
                        </label>
                        <select
                          value={settings.appearance.voiceLanguage}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              appearance: { ...settings.appearance, voiceLanguage: e.target.value as any },
                            })
                          }
                          className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs"
                        >
                          <option value="id-ID">Bahasa Indonesia (id-ID)</option>
                          <option value="en-US">English (en-US)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </DialogBody>

      <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card/90 px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetDefaults}
          disabled={saving}
          className="min-h-[44px] sm:min-h-[36px] text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Setel Ulang Bawaan
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={saving}
            className="min-h-[44px] sm:min-h-[36px] text-xs"
          >
            Tutup
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="min-h-[44px] sm:min-h-[36px] text-xs"
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Simpan Pengaturan
              </>
            )}
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
