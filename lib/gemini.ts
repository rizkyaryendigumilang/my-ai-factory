import 'server-only';
import {
  GoogleGenerativeAI,
  FinishReason,
  type Part,
} from '@google/generative-ai';

/** Server-only Gemini wrapper. Never import this from a client component. */

/** Primary model, then fallbacks tried when a model is unavailable (404) or overloaded (503). */
const MODELS = [process.env.GEMINI_MODEL ?? 'gemini-1.5-flash', ...(process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-2.0-flash,gemini-1.5-pro,gemini-flash-latest').split(',')]
  .map((m) => m.trim())
  .filter(Boolean);
const REQUEST_TIMEOUT_MS = 240_000;

export function getApiKey(): string {
  return process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '';
}

/** True when AI calls can be made. When false the app runs in offline demo mode. */
export function geminiAvailable(): boolean {
  return process.env.FACTORY_MOCK !== '1' && !!getApiKey();
}

let client: GoogleGenerativeAI | null = null;
function getClient() {
  if (!client) client = new GoogleGenerativeAI(getApiKey());
  return client;
}

export type GeminiGenerateOptions = {
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  json?: boolean;
  /** Inline images (base64, no data: prefix) sent alongside the prompt. */
  images?: { data: string; mimeType: string }[];
};

export type GenerateResult = { text: string; truncated: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Generate text, retrying transient (429/5xx) errors. Reports MAX_TOKENS truncation. */
export async function generateWithMeta(
  prompt: string,
  opts: GeminiGenerateOptions = {}
): Promise<GenerateResult> {
  if (!getApiKey()) throw new Error('GEMINI_API_KEY belum diatur di .env.local');

  const parts: (string | Part)[] = [prompt];
  for (const img of opts.images ?? []) parts.push({ inlineData: img });

  const errors = new Map<string, string>();
  const retired = new Set<string>();
  // Two rounds over the model list; the second round waits longer so short overload spikes pass.
  for (let round = 0; round < 2; round++) {
    if (round > 0) await sleep(10_000);
    for (const modelName of MODELS) {
      if (retired.has(modelName)) continue;
      const until = exhaustedUntil.get(modelName) ?? 0;
      if (until > Date.now()) {
        errors.set(modelName, `${modelName}: kuota habis (${fmtWait(until - Date.now())} lagi)`);
        continue;
      }
      const model = getClient().getGenerativeModel(
        {
          model: modelName,
          systemInstruction: opts.systemInstruction,
          generationConfig: {
            temperature: opts.temperature ?? 0.4,
            maxOutputTokens: opts.maxOutputTokens ?? 32768,
            ...(opts.json ? { responseMimeType: 'application/json' } : {}),
          },
        },
        { timeout: REQUEST_TIMEOUT_MS }
      );

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await model.generateContent(parts);
          const candidate = result.response.candidates?.[0];
          return {
            text: result.response.text(),
            truncated: candidate?.finishReason === FinishReason.MAX_TOKENS,
          };
        } catch (err: any) {
          const status = err?.status ?? 0;
          const retryMs = retryDelayMs(err);
          if (status === 429 && retryMs > 60_000) {
            // Quota exhausted (e.g. free-tier daily limit): retrying now is pointless.
            exhaustedUntil.set(modelName, Date.now() + retryMs);
            errors.set(modelName, `${modelName}: kuota habis (${fmtWait(retryMs)} lagi)`);
            break;
          }
          errors.set(modelName, `${modelName}: ${status || ''} ${shortError(err)}`.trim());
          if (status === 404) {
            retired.add(modelName); // model retired for this key: skip it from now on
            break;
          }
          const transient = status === 429 || status >= 500 || /fetch failed|ECONNRESET|aborted|timeout/i.test(String(err?.message));
          if (!transient) throw new Error(errors.get(modelName));
          if (attempt < 2) await sleep(Math.max(retryMs, 2000 * 2 ** attempt));
        }
      }
    }
    // Nothing left that could succeed on a second round.
    if (MODELS.every((m) => retired.has(m) || (exhaustedUntil.get(m) ?? 0) > Date.now())) break;
  }
  const allQuota = MODELS.every((m) => retired.has(m) || (exhaustedUntil.get(m) ?? 0) > Date.now());
  throw new Error(
    allQuota
      ? `Kuota Gemini API habis untuk semua model (${[...errors.values()].join(' | ')}). Tunggu reset kuota, ganti GEMINI_API_KEY, atau aktifkan billing di Google AI Studio.`
      : `Semua model Gemini gagal → ${[...errors.values()].join(' | ')}`
  );
}

/** Process-wide memory of models whose quota is exhausted, so later calls fail fast. */
const exhaustedUntil: Map<string, number> = ((globalThis as any).__geminiExhausted ??= new Map());

/** Reads google.rpc.RetryInfo ("retryDelay":"18551s") from an SDK error, in ms. */
function retryDelayMs(err: any): number {
  const fromDetails = (err?.errorDetails ?? []).find((d: any) => d?.retryDelay)?.retryDelay;
  const raw = fromDetails ?? /"retryDelay":"([\d.]+)s"/.exec(String(err?.message))?.[1];
  const secs = parseFloat(String(raw ?? '').replace(/s$/, ''));
  return Number.isFinite(secs) ? secs * 1000 : 0;
}

function fmtWait(ms: number): string {
  const min = Math.ceil(ms / 60_000);
  return min >= 60 ? `~${Math.round(min / 60)} jam` : `~${min} menit`;
}

/** Strip the SDK's long "Error fetching from https://…" prefix to keep logs readable. */
function shortError(err: any): string {
  const msg = String(err?.message ?? err);
  const m = /\]\s*([^[]+)$/.exec(msg);
  return (m ? m[1] : msg).trim().slice(0, 200);
}

/** Extract and parse the first JSON value in a model response. */
export function parseJsonLoose<T = any>(text: string): T {
  const cleaned = text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[\[{]/);
    const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new Error('Respons AI bukan JSON valid');
  }
}

/** Generate JSON using Gemini's JSON mode; retries once if the payload is malformed. */
export async function generateJson<T = any>(
  prompt: string,
  opts: GeminiGenerateOptions = {}
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < 2; i++) {
    const { text } = await generateWithMeta(prompt, { ...opts, json: true });
    try {
      return parseJsonLoose<T>(text);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Respons AI bukan JSON valid');
}

/** Split a data URL (data:image/png;base64,....) into Gemini inlineData. */
export function imageFromDataUrl(url: string): { data: string; mimeType: string } | null {
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(url);
  return m ? { mimeType: m[1], data: m[2] } : null;
}
