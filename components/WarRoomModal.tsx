'use client';

import { useState } from 'react';
import {
  Users,
  X,
  Send,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Check,
  Copy,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/use-project';
import type { AgentWarRoomResponse } from '@/app/api/meetings/war-room/route';

interface WarRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
}

const PRESETS = [
  'Apakah arsitektur dan relasi database saat ini sudah aman dan scalable?',
  'Bagaimana strategi rilis MVP paling efisien tanpa mengorbankan kualitas?',
  'Apakah ada celah keamanan OWASP atau risiko kebocoran data pada flow ini?',
  'Apakah ritme visual UX dan design tokens sudah memenuhi standar modern?',
];

export default function WarRoomModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
}: WarRoomModalProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState<AgentWarRoomResponse[]>([]);
  const [lastQuestion, setLastQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedRole, setCopiedRole] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async (qToSend?: string) => {
    const q = (qToSend ?? question).trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api<{ ok: boolean; responses: AgentWarRoomResponse[]; question: string }>(
        '/api/meetings/war-room',
        {
          method: 'POST',
          body: JSON.stringify({ projectId, question: q }),
        }
      );
      if (res.responses) {
        setResponses(res.responses);
        setLastQuestion(q);
        setQuestion('');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal menyelenggarakan rapat');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (role: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRole(role);
    setTimeout(() => setCopiedRole(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex h-[90vh] max-h-[850px] w-full max-w-5xl flex-col rounded-2xl border border-white/[0.1] bg-[#0A0E17]/95 shadow-2xl backdrop-blur-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-foreground">
                  War Room Sentral — Rapat Meja Bundar Multi-Agent
                </h2>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  6 Divisi Hadir
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Diskusi strategis serentak bersama tim spesialis AI untuk proyek:{' '}
                <strong className="text-foreground">{projectTitle}</strong>
              </p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Preset chips */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-white/[0.06] px-6 py-2 bg-black/40">
          <span className="text-[11px] font-medium text-muted-foreground shrink-0 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" /> Topik Cepat:
          </span>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              disabled={loading}
              onClick={() => {
                setQuestion(p);
                handleSend(p);
              }}
              className="shrink-0 text-left rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground hover:border-white/[0.15] transition-all"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {lastQuestion && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-xs text-foreground flex items-start gap-2.5">
              <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-primary">Pertanyaan Commander Kiky:</span>
                <p className="mt-0.5 text-foreground leading-relaxed">&ldquo;{lastQuestion}&rdquo;</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/15 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {responses.length === 0 && !loading ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
              <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">Meja Rapat Bundar Siap</h3>
              <p className="max-w-md text-xs mt-1 text-muted-foreground leading-relaxed">
                Tanyakan keputusan arsitektur, trade-off scope, kesiapan keamanan, atau estetika UI.
                Semua 6 spesialis akan memberikan perspektif masing-masing secara serentak.
              </p>
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {responses.map((r) => (
                <div
                  key={r.role}
                  className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0E131F]/90 p-4 shadow-sm hover:border-white/[0.15] transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold ${r.avatarColor}`}
                        >
                          {r.agentName[0]}
                        </span>
                        <div>
                          <div className="font-semibold text-xs text-foreground leading-none">
                            {r.agentName}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{r.title}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(r.role, `${r.agentName} (${r.title}): ${r.opinion}`)}
                        className="rounded p-1 text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
                        title="Salin opini"
                      >
                        {copiedRole === r.role ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed">{r.opinion}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              <span>Para spesialis sedang menganalisis dan mendiskusikan tanggapan…</span>
            </div>
          )}
        </div>

        {/* Footer Question Input */}
        <div className="border-t border-white/[0.08] bg-[#080B11]/90 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
              placeholder="Ajukan pertanyaan atau arahkan pembahasan ke semua 6 spesialis..."
              className="flex-1 rounded-xl border border-white/[0.1] bg-black/40 px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
            <Button
              type="submit"
              disabled={loading || !question.trim()}
              className="bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs px-4 h-9 shadow-sm"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Kirim ke Rapat
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
