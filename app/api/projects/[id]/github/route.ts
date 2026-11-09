import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { diagramToDrawio, isDiagramDoc } from '@/lib/drawio';
import { docToMarkdown, slug } from '@/lib/export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await store.getOwnedProjectState(id);
  if (!state) {
    return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  }

  if (!state.files.length) {
    return NextResponse.json({ error: 'Belum ada file kode untuk diekspor' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const token = (body.token || '').trim();
  const repoName = (body.repoName || slug(state.project.title)).trim().replace(/[^a-zA-Z0-9._-]/g, '-');
  const isPrivate = Boolean(body.isPrivate ?? false);
  const description = body.description || `${state.project.title} - Dibuat otomatis oleh My AI Factory`;

  if (!token) {
    return NextResponse.json({ error: 'GitHub Personal Access Token wajib diisi' }, { status: 400 });
  }

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'My-AI-Factory-Exporter',
      'Content-Type': 'application/json',
    };

    // 1. Create Repository
    const createRepoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: repoName,
        private: isPrivate,
        description,
        auto_init: true,
      }),
    });

    const repoData = await createRepoRes.json();
    if (!createRepoRes.ok && createRepoRes.status !== 422) {
      return NextResponse.json({ error: `Gagal membuat repo: ${repoData.message || createRepoRes.statusText}` }, { status: createRepoRes.status });
    }

    // Get current user info if repoData is 422 (already exists)
    let owner = repoData.owner?.login;
    let htmlUrl = repoData.html_url;
    if (!owner) {
      const userRes = await fetch('https://api.github.com/user', { headers });
      const userData = await userRes.json();
      owner = userData.login;
      htmlUrl = `https://github.com/${owner}/${repoName}`;
    }

    // Prepare all files
    const fileItems: { path: string; content: string }[] = [];
    for (const f of state.files) {
      fileItems.push({ path: f.file_path, content: f.file_content });
    }

    // Add documentation files
    for (const d of state.documents) {
      if (isDiagramDoc(d.content_json)) {
        fileItems.push({
          path: `docs/${d.doc_type}.drawio`,
          content: diagramToDrawio(d.content_json, d.content_json.title || d.doc_type),
        });
        fileItems.push({
          path: `docs/${d.doc_type}.mmd`,
          content: d.content_json.mermaid,
        });
      } else {
        fileItems.push({
          path: `docs/${d.doc_type}.md`,
          content: docToMarkdown(d),
        });
      }
    }

    // Commit files via Git Trees API
    // 2. Create Tree
    const treeItems = fileItems.map((f) => ({
      path: f.path,
      mode: '100644',
      type: 'blob',
      content: f.content,
    }));

    // Get latest commit on main/master
    let defaultBranch = 'main';
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/main`, { headers });
    let parentSha = '';
    if (refRes.ok) {
      const refData = await refRes.json();
      parentSha = refData.object.sha;
    } else {
      const masterRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/master`, { headers });
      if (masterRes.ok) {
        defaultBranch = 'master';
        const masterData = await masterRes.json();
        parentSha = masterData.object.sha;
      }
    }

    const treePayload: any = { tree: treeItems };
    if (parentSha) treePayload.base_tree = parentSha;

    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify(treePayload),
    });
    const treeData = await treeRes.json();
    if (!treeRes.ok) throw new Error(`Gagal membuat tree: ${treeData.message}`);

    // 3. Create Commit
    const commitPayload: any = {
      message: `feat: generate ${state.project.title} from My AI Factory\n\nGenerated with 6 AI specialists including architecture diagrams and full code.`,
      tree: treeData.sha,
    };
    if (parentSha) commitPayload.parents = [parentSha];

    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(commitPayload),
    });
    const commitData = await commitRes.json();
    if (!commitRes.ok) throw new Error(`Gagal membuat commit: ${commitData.message}`);

    // 4. Update branch ref
    const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${defaultBranch}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sha: commitData.sha, force: true }),
    });

    if (!updateRefRes.ok) {
      // If ref didn't exist yet, create it
      await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ref: `refs/heads/${defaultBranch}`, sha: commitData.sha }),
      });
    }

    return NextResponse.json({
      ok: true,
      url: htmlUrl,
      repo: `${owner}/${repoName}`,
      filesCount: fileItems.length,
      branch: defaultBranch,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal export ke GitHub' }, { status: 500 });
  }
}
