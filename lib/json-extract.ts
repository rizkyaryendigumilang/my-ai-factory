/**
 * Extracts a typed JSON object or array from model output.
 * Tolerates raw JSON, markdown-fenced json (```json ... ```), and preamble/conversational text.
 */
export function extractJsonFromText<T>(text: string): T {
  if (!text || typeof text !== 'string') {
    throw new Error('Gagal mengekstrak JSON: respons model kosong.');
  }
  const trimmed = text.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed) as T;
  } catch {}

  // 2. Markdown fenced block: ```json ... ``` or ``` ... ```
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const matchFence = trimmed.match(fenceRegex);
  if (matchFence && matchFence[1]) {
    try {
      return JSON.parse(matchFence[1].trim()) as T;
    } catch {}
  }

  // 3. Find outer object braces { ... }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as T;
    } catch {}
  }

  // 4. Find outer array brackets [ ... ]
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1)) as T;
    } catch {}
  }

  throw new Error(`Gagal mengekstrak JSON dari output model: ${trimmed.slice(0, 160)}`);
}
