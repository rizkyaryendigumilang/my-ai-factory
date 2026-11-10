import { NextResponse } from 'next/server';
import https from 'node:https';
import http from 'node:http';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  getEffectiveGeminiKey,
  getEffectiveGithubToken,
  getEffectiveHermesUrl,
  readRawSettings,
} from '@/lib/settings-store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'gemini') {
      const apiKey = (body.apiKey && !body.apiKey.startsWith('••'))
        ? body.apiKey.trim()
        : getEffectiveGeminiKey();

      if (!apiKey) {
        return NextResponse.json({ ok: false, message: 'Gemini API Key belum diisi.' });
      }

      try {
        const client = new GoogleGenerativeAI(apiKey);
        const modelName = body.model || 'gemini-1.5-flash';
        const model = client.getGenerativeModel({ model: modelName });
        // shortcut: countTokens memverifikasi kunci & model tanpa membuang token keluaran
        await model.countTokens({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        });
        return NextResponse.json({
          ok: true,
          message: `Koneksi Google Gemini aktif (${modelName}). Kuota dan autentikasi valid.`,
        });
      } catch (err: any) {
        return NextResponse.json({
          ok: false,
          message: `Koneksi Gemini gagal: ${err.message || 'Kunci API tidak valid atau kuota habis'}`,
        });
      }
    }

    if (action === 'hermes') {
      const endpoint = body.endpoint || getEffectiveHermesUrl();
      if (!endpoint) {
        return NextResponse.json({ ok: false, message: 'Hermes Endpoint belum ditentukan.' });
      }

      const start = Date.now();
      try {
        const u = new URL(endpoint);
        const client = u.protocol === 'https:' ? https : http;
        const res = await new Promise<any>((resolve, reject) => {
          const r = client.request(
            {
              hostname: u.hostname,
              port: u.port || (u.protocol === 'https:' ? 443 : 80),
              path: u.pathname || '/',
              method: 'GET',
              rejectUnauthorized: false, // VPS internal certificate tolerance
              timeout: 6000,
            },
            (response) => {
              let data = '';
              response.on('data', (c) => (data += c));
              response.on('end', () => resolve({ statusCode: response.statusCode, data }));
            }
          );
          r.on('error', reject);
          r.on('timeout', () => {
            r.destroy();
            reject(new Error('Koneksi timeout setelah 6 detik'));
          });
          r.end();
        });

        const latency = Date.now() - start;
        return NextResponse.json({
          ok: true,
          latencyMs: latency,
          statusCode: res.statusCode,
          message: `Hermes VPS Terhubung! Latensi: ${latency}ms (HTTP ${res.statusCode})`,
        });
      } catch (err: any) {
        return NextResponse.json({
          ok: false,
          message: `Hermes VPS tidak dapat dijangkau: ${err.message}`,
        });
      }
    }

    if (action === 'github') {
      const token = (body.token && !body.token.startsWith('••'))
        ? body.token.trim()
        : getEffectiveGithubToken();

      if (!token) {
        return NextResponse.json({ ok: false, message: 'GitHub Token belum diisi.' });
      }

      try {
        const ghRes = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'My-AI-Factory-Settings',
          },
        });

        const data = await ghRes.json();
        if (!ghRes.ok) {
          return NextResponse.json({
            ok: false,
            message: `Autentikasi GitHub gagal: ${data.message || ghRes.statusText}`,
          });
        }

        return NextResponse.json({
          ok: true,
          user: {
            login: data.login,
            name: data.name,
            avatar_url: data.avatar_url,
            public_repos: data.public_repos,
          },
          message: `Akun GitHub terverifikasi: @${data.login} (${data.name || 'User'})`,
        });
      } catch (err: any) {
        return NextResponse.json({
          ok: false,
          message: `Koneksi GitHub error: ${err.message}`,
        });
      }
    }

    if (action === 'pocketbase') {
      const raw = readRawSettings();
      const pbUrl = body.url || raw.vps.pocketbaseUrl;
      try {
        const pbRes = await fetch(`${pbUrl}/api/health`, { signal: AbortSignal.timeout(4000) });
        const pbData = await pbRes.json().catch(() => ({}));
        if (pbRes.ok) {
          return NextResponse.json({
            ok: true,
            message: `PocketBase online! Status: ${pbData.message || 'OK'} (HTTP ${pbRes.status})`,
          });
        }
        return NextResponse.json({
          ok: false,
          message: `PocketBase merespon HTTP ${pbRes.status}`,
        });
      } catch (err: any) {
        return NextResponse.json({
          ok: false,
          message: `PocketBase offline / tidak dapat dihubungi: ${err.message}`,
        });
      }
    }

    return NextResponse.json({ ok: false, message: 'Aksi test tidak dikenali' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
