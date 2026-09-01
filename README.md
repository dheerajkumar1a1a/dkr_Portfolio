# dkr_Portfolio — Automated Portfolio Publishing Pipeline

> **Statically-exported Next.js portfolio + edge-mediated AI publishing** — turn free-text `Raw Notes` into versioned `Portfolio Entries` (`_posts/*.md`) via a two-phase `Admin Portal` → `Edge Worker` → `Ollama` → `GitHub` pipeline. Live at **https://dheerajkumar1a1a.github.io/dkr_Portfolio/**.

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![Ollama](https://img.shields.io/badge/Ollama-glm--4.7--flash%20%7C%20llama3.1-blue)](https://ollama.com/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-2ea44f)](https://pages.github.com/)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue)](./LICENSE)

---

## Table of Contents

- [What This Is](#what-this-is)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage — Admin Portal](#usage--admin-portal)
- [Content Model](#content-model)
- [Validation & Build](#validation--build)
- [Edge Worker API](#edge-worker-api)
- [Deployment](#deployment)
- [Is It Free and Unlimited?](#is-it-free-and-unlimited)
- [Project Structure](#project-structure)
- [ADRs & Domain Language](#adrs--domain-language)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [License](#license)

---

## What This Is

A personal portfolio for **Dheeraj Kumar — Data Science & Automation Engineer** that eliminates manual markdown authoring:

1. Press `Ctrl+Shift+A` to open the `Admin Portal` modal.
2. Paste `Raw Notes` (unformatted project dump) + `Admin Password` + optional `Ollama URL` → **Phase 1**.
3. `Edge Worker` asks Ollama (self-hosted, e.g. `glm-4.7-flash:latest` via Cloudflare Tunnel) to judge if notes contain enough `architecture / metrics / STAR` detail.
   - **Insufficient** → `Interview State: needs_answers` + 3–5 `Clarifications` (`{question, answer}`).
   - **Sufficient** → generates a `Portfolio Entry`.
4. Answer `Clarifications` → **Phase 2** (or `Skip Questions & Deploy Anyway` to force publish with `N/A` placeholders).
5. Worker `PUT`s base64-encoded markdown to `dheerajkumar1a1a/dkr_Portfolio/contents/_posts/YYYY-MM-DD-portfolio-update-XXXXXX.md` (with `sha` if exists, `branch: main`).
6. `GitHub Actions` validates, builds `next build` (`output: export`), and serves via `GitHub Pages`.

Historically an `n8n` workflow at `n8n-sh-dkr.duckdns.org/webhook/portfolio-update` performed steps 3–5; it has been replaced by the `Edge Worker` at `https://portfolio-pipeline-worker.prtf.workers.dev` (see `docs/adr/0001-cloudflare-worker-replaces-n8n.md`).

---

## Features

- **Two-phase interview** — AI asks only when needed; `Skip Questions & Deploy Anyway` always available.
- **User-provided Ollama URL** — input `https://...trycloudflare.com/v1` in the modal (pattern `https://*/v1`) overrides the server secret `OLLAMA_TUNNEL_URL`; great for per-device models without redeploy.
- **Server-controlled filenames** — `YYYY-MM-DD-portfolio-update-<6hex>.md` prevents path traversal even if the LLM hallucinates a path.
- **Strict `Frontmatter` contract** — `title`, `date:"YYYY-MM-DD"`, `techStack: string[]`, `summary` all quoted, validated in CI.
- **Lenient runtime, strict CI** — `src/lib/api.ts` warns and skips malformed entries (site never blanks); `scripts/validate-posts.mjs` fails the `Actions` build.
- **CORS allowlist** — `https://dheerajkumar1a1a.github.io` + `http://localhost:3000`, `Vary: Origin`.
- **UTF-8 safe base64** — `TextEncoder → btoa` handles emojis; `GET sha` before `PUT` avoids `409`.
- **AGPL-3.0** — fully open, self-hostable.

---

## Architecture

```
[ AdminPortal.tsx Ctrl+Shift+A ] ── POST {password, rawNotes, clarifications?, skipQuestions?, ollamaUrl?} ──> [ Edge Worker prtf.workers.dev ]
       │                                                                                                      │
       │  ← {status:"needs_answers",questions} / {status:"success",filename} / {status:"error",message} ──────┤
       │                                                                                                      │
       │                                        ┌─(POST /api/chat format:json think:false 45s timeout)───────┘
       │                                        ▼
       │                               [ Local Ollama glm-4.7-flash:latest via Cloudflare Tunnel driver-pleased-...trycloudflare.com ]
       │                                        ▲
       │                                        │  JSON {needs_more_info, questions, final_markdown}
       │                                                                                                      │
       └───────────────────────────────────(PUT /repos/.../contents/_posts/*.md base64, branch:main, sha?)──> [ GitHub REST API ]
                                                                                                                    │
                                                                                                                    ▼
                                                                                                          [ GitHub Actions deploy.yml ]
                                                                                                                    │
                                                                                                                    ▼
                                                                                                            [ GitHub Pages https://dheerajkumar1a1a.github.io/dkr_Portfolio/ ]
```

**Request flow detail:**

- `AdminPortal` → `Worker`: `password` (plain, compared only server-side to `env.ADMIN_PASSWORD`), `rawNotes`, optional `clarifications: Clarification[]`, optional `skipQuestions: boolean`, optional `ollamaUrl: "https://.../v1"`.
- `Worker` → `Ollama`: `POST {tunnelBase}/api/chat` with `model: env.OLLAMA_MODEL || "glm-4.7-flash:latest"`, `format:"json"`, `think:false`, `systemPrompt` (STAR + Frontmatter spec) + `userMessage` (Raw Notes + Clarifications or `[SKIP]` directive).
- `Worker` → `GitHub`: `GET` (cache:no-store) for `sha`, then `PUT` with `message: feat(blog): add {filename} via edge worker`.

See `CONTEXT.md` for ubiquitous language (`Raw Notes`/`Clarification`/`Portfolio Entry`/`Frontmatter`/`Interview State`/`Publish`) and `docs/adr/`.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Site** | Next.js 15.5, `output: export`, `basePath: /dkr_Portfolio`, React 19, Tailwind 3.4 (dark glassmorphism), `gray-matter` + `remark`/`remark-html` | Static, no server, fast Pages deploy; `src/lib/api.ts` compiles `_posts/*.md` at build |
| **Edge** | Cloudflare Workers (`backend-worker/src/index.js`, `wrangler.toml` `compatibility_date 2026-09-01`), `wrangler 3.114` | Zero-cost for this volume, 10 KiB upload, global edge, `fetch` to Ollama + GitHub |
| **LLM** | Self-hosted Ollama (`glm-4.7-flash:latest` 29.9B Q4_K_M, fallback `llama3.1:8b`/`qwen2.5:14b`) via Cloudflare Tunnel (`https://...trycloudflare.com`) `POST /api/chat format:json` | No per-token cost, privacy, `think:false` 1.8s vague / 14.7s detailed |
| **CI/CD** | GitHub Actions `deploy.yml` (`checkout@v4`, `setup-node@v4` 22, `npm ci`, `validate:posts`, `next build`, `upload-pages-artifact@v3` → `deploy-pages@v4`), `pages: write` | Validates frontmatter before export |
| **Validation** | `scripts/validate-posts.mjs` (Node, `gray-matter`) + lenient `src/lib/api.ts` | Never blank homepage, but fail build on bad YAML |
| **Legacy** | `Automated Portfolio Updater (GitHub Pages).json` (n8n workflow, kept for reference) | Replaced by Worker |

---

## Prerequisites

- **Node.js 18+** (22 recommended) + `npm`
- **Cloudflare account** (free) — to create `CLOUDFLARE_API_TOKEN` (Workers edit) and `portfolio-pipeline-worker` subdomain `prtf`
- **Ollama host** with ≥8 GB VRAM (8B Q4_K_M) or ≥16 GB (14B) — e.g. `ollama pull glm-4.7-flash:latest` + `ollama serve` + `cloudflared tunnel --url http://localhost:11434` (quick `trycloudflare.com` for dev, named tunnel for prod)
- **GitHub** `Fine-Grained PAT` on `dkr_Portfolio` with `Contents: Read & Write` (or classic `repo` scope) — used as `GITHUB_PAT`
- **Git** + `wrangler` (`npm install -g wrangler` or `npx wrangler` via `backend-worker/`)

---

## Quick Start

```bash
git clone https://github.com/dheerajkumar1a1a/dkr_Portfolio.git
cd dkr_Portfolio
npm ci
npm run dev          # http://localhost:3000/dkr_Portfolio
# in another shell:
cd backend-worker && npm ci
# create backend-worker/.dev.vars (gitignored) for wrangler dev:
# ADMIN_PASSWORD=dkr1a1a
# GITHUB_PAT=ghp_...
# OLLAMA_TUNNEL_URL=https://...trycloudflare.com
# OLLAMA_MODEL=glm-4.7-flash:latest
npx wrangler dev --local  # optional local worker at http://localhost:8787
```

---

## Configuration

### 1. `backend-worker/wrangler.toml`

```toml
name = "portfolio-pipeline-worker"
main = "src/index.js"
compatibility_date = "2026-09-01"
```

### 2. Secrets (run from `backend-worker/`)

```powershell
# PowerShell — each `secret put` triggers an automatic redeploy
"dkr1a1a" | npx wrangler secret put ADMIN_PASSWORD
"ghp_..." | npx wrangler secret put GITHUB_PAT
"https://driver-pleased-gzip-deployment.trycloudflare.com" | npx wrangler secret put OLLAMA_TUNNEL_URL
"glm-4.7-flash:latest" | npx wrangler secret put OLLAMA_MODEL
npx wrangler secret list  # verify
```

- `ADMIN_PASSWORD` — compared server-side only; never bundled to client except as user input.
- `GITHUB_PAT` — fine-grained `Contents:RW` on `dkr_Portfolio` (90-day expiry, set calendar reminder).
- `OLLAMA_TUNNEL_URL` — base **without** `/v1` suffix is fine (worker strips `/v1`/`/v1/chat/completions` automatically). Quick tunnels (`trycloudflare.com`) expire on `cloudflared` restart — use `cloudflared tunnel create portfolio-ollama` + `cloudflared tunnel route dns` for persistent.
- `OLLAMA_MODEL` — `glm-4.7-flash:latest` (only model currently on the demo host; `llama3.1:8b` would 404), or any `ollama list` name.

### 3. Frontend Worker URL

`src/components/AdminPortal.tsx:6`

```ts
const WORKER_URL = "https://portfolio-pipeline-worker.prtf.workers.dev";
```

Replace `prtf` if you choose a different `workers.dev` subdomain (`https://dash.cloudflare.com/.../workers/subdomain`).

### 4. GitHub Pages

`next.config.mjs:2`

```js
const nextConfig = { output: "export", basePath: "/dkr_Portfolio" };
```

Repo **Settings → Pages → Source: GitHub Actions** (not `Deploy from branch`).

---

## Usage — Admin Portal

- **Open:** `Ctrl+Shift+A` (or `Ctrl+Shift+a`), `Esc` to close. Modal is `src/components/AdminPortal.tsx`.
- **Phase 1 — Raw Notes:**
  - `Ollama URL ending with /v1` — optional, e.g. `https://abc.trycloudflare.com/v1`. If empty, worker uses `OLLAMA_TUNNEL_URL` secret. Useful to point at a colleague’s tunnel or a new model without redeploy.
  - `Raw Notes` textarea — paste free-text (e.g. “Upgraded Android app to Gradle 9.5…”).
  - `Admin Password` — `dkr1a1a` (or your secret).
  - `Process & Deploy` → `POST` to `WORKER_URL`.
- **Phase 2 — Interview:**
  - Worker returns `needs_answers` + 3–5 questions (e.g. “Which Gradle version? Metrics?”).
  - Fill `Your answer…` fields (required) or leave empty → server normalizes to `"N/A"`.
  - **Two actions:**
    - `Submit Answers & Deploy` — sends `clarifications: [{question, answer}]`.
    - `Skip Questions & Deploy Anyway` (amber) — sends `clarifications` with `N/A` + `skipQuestions:true`; worker appends `CRITICAL: SKIP ... MUST set needs_more_info=false` to `systemPrompt` and forces markdown generation from available info (sparse but valid).
  - `Cancel` discards; on `success`, modal resets.
- **Publish:** Worker `PUT`s `_posts/YYYY-MM-DD-portfolio-update-XXXXXX.md` (e.g. `2026-09-01-portfolio-update-cc6a2a.md`) → `Actions` builds in ~55s → Pages live in 2–3m → new card appears on `src/app/page.tsx` grid (sorted by `frontmatter.date` desc, fallback `birthtime`).

**Keyboard & idempotency:** `disabled={busy}` + `if(busy) return` guards double-submit; `Enter` submits form.

---

## Content Model

### `Portfolio Entry` — `_posts/*.md`

Single markdown file **must** have `---` delimiters and `Frontmatter`:

```yaml
---
title: "Automated Kaggle Notebook Documentation Pipeline"
date: "2024-06-23"          # quoted "YYYY-MM-DD" — worker normalizes even if LLM emits 2024-06-23T00:00:00.000Z
techStack: ["Python", "Hugo", "Docker"]
summary: "Built a Python pipeline to automate documentation..."
---

## Situation
...

## Task
...

## Action
1. ...

## Result
...
```

| Field | Type | Notes |
|-------|------|-------|
| `title` | `string` quoted | Human title, no kebab |
| `date` | `"YYYY-MM-DD"` quoted | `api.ts` `parseFrontmatterDate` slices ISO prefix, `validate-posts` accepts `Date` objects from `js-yaml` |
| `techStack` | `string[]` JSON array | 1–8 items |
| `summary` | `string` quoted | <200 chars |

`src/lib/api.ts:18` `parseFrontmatterDate` and `scripts/validate-posts.mjs:52` both handle `string` *or* `Date` (slicing `2024-06-23T...` to `2024-06-23`). Worker `normalizeFrontmatter:39` rewrites `date: ...` to `date: "YYYY-MM-DD"` via regex before `GITHUB_PAT` commit.

**Legacy:** `_posts/2026-08-24-*.md` previously lacked opening `---`; fixed in `e38e6c2`. `content/projects/*.mdx` (6 files) was dead code (never read by `api.ts:25` filter `endsWith(".md")`) and deleted.

---

## Validation & Build

```bash
npm run validate:posts  # node scripts/validate-posts.mjs
# [validate-posts] OK 2026-08-24-portfolio-update-306.md
# [validate-posts] OK ... (fails on missing --- / bad date / empty techStack)

npm run build            # next build → out/ (static export)
npm run dev              # next dev (basePath still /dkr_Portfolio)
```

`validate-posts.mjs` checks: opening `---`, required fields, `title`/`summary` strings, `date` `YYYY-MM-DD` (or ISO prefix, or `Date` object), `techStack` non-empty `string[]`. `api.ts` is lenient: `console.warn` and `return null` (filtered) so a single bad file never blanks the homepage (`page.tsx:26` shows “Awaiting Data” only if zero valid).

`deploy.yml:32` runs `Validate Portfolio Entries` **before** `Build Next.js site`, so `a767860` correctly `failure` on bad date, `e38e6c2` `success`.

---

## Edge Worker API

**Base URL:** `https://portfolio-pipeline-worker.prtf.workers.dev` (see `wrangler deploy` output; update `AdminPortal.tsx:6` if changed).

**CORS:** `OPTIONS` returns `Access-Control-Allow-Origin: https://dheerajkumar1a1a.github.io` (allowlisted, `Vary: Origin`) + `Access-Control-Allow-Headers: Content-Type, Authorization`.

### `POST /` (the only route)

**Request JSON:**

```ts
{
  password: string,               // required, vs env.ADMIN_PASSWORD
  rawNotes: string,               // required
  clarifications?: { question:string, answer:string }[], // optional, from Phase 2
  skipQuestions?: boolean,         // optional, from Skip button
  ollamaUrl?: string              // optional, "https://.../v1" — overrides env.OLLAMA_TUNNEL_URL
}
```

**Response JSON — discriminated `Interview State`:**

```ts
// 401
{ status: "error", message: "Unauthorized: Invalid admin password" }
// 400
{ status: "error", message: "Missing required fields: password, rawNotes" }
{ status: "error", message: "Missing Ollama URL — provide ollamaUrl ending with /v1..." }
{ status: "error", message: "Invalid ollamaUrl — must be a valid https URL ending with /v1" }
// 502 (AI)
{ status: "error", message: "AI service unavailable — tunnel offline" } // timeout 45s or ollama non-2xx
{ status: "error", message: "AI returned malformed structured output" }
// 200 needs_answers
{ status: "needs_answers", questions: string[] } // 3–5
// 200 success
{ status: "success", filename: "2026-09-01-portfolio-update-xxxxxx.md" }
// 502 GitHub
{ status: "error", message: "Failed to commit entry to GitHub repository" }
```

**Ollama contract (inside Worker):** `POST {tunnelBase}/api/chat` (`/v1` stripped, `/api/chat` appended), `model: env.OLLAMA_MODEL || "glm-4.7-flash:latest"`, `format:"json"`, `think:false`, `stream:false`, `AbortSignal.timeout(45000)`. System prompt enforces `needs_more_info`/`questions`/`final_markdown` JSON, quoted `date`. `stripFences:26` + `JSON.parse` + `normalizeFrontmatter:39`.

**GitHub commit:** `GET /repos/.../contents/_posts/{filename}` `cache:no-store` for `sha` (200 → update, 404 → create), then `PUT` `content: TextEncoder→btoa`, `branch: main`, `message: feat(blog): add ... via edge worker`.

**Test via curl:**

```bash
curl -i -X POST https://portfolio-pipeline-worker.prtf.workers.dev \
  -H "Content-Type: application/json" -H "Origin: https://dheerajkumar1a1a.github.io" \
  -d '{"password":"dkr1a1a","rawNotes":"Built RAG with Qdrant, 20ms p95","ollamaUrl":"https://driver-pleased-gzip-deployment.trycloudflare.com/v1"}'
```

---

## Deployment

### Worker

```bash
cd backend-worker
npx wrangler deploy                 # needs CLOUDFLARE_API_TOKEN (Workers Edit)
npx wrangler secret put ADMIN_PASSWORD   # then paste dkr1a1a
npx wrangler secret put GITHUB_PAT       # ghp_... fine-grained
npx wrangler secret put OLLAMA_TUNNEL_URL # https://...trycloudflare.com (optional if always client-provided)
npx wrangler secret put OLLAMA_MODEL      # glm-4.7-flash:latest
npx wrangler deploy --dry-run       # 12.08 KiB / gzip 3.57 KiB
npx wrangler tail                   # live logs
```

### Site (GitHub Pages)

```bash
git add _posts/ src/ backend-worker/ scripts/ CONTEXT.md docs/
git commit -m "feat: ..."
git push origin main
# → Actions: Deploy to GitHub Pages (in_progress → success ~55s)
# URL: https://dheerajkumar1a1a.github.io/dkr_Portfolio/
```

**Environment separation:** `next.config.mjs` `basePath` does **not** affect `WORKER_URL` (absolute). Worker `ALLOWED_ORIGINS:1` must include your Pages origin.

---

## Is It Free and Unlimited?

**No — it is free to self-host, but not unlimited.** Source is **AGPL-3.0** (free as in freedom, zero license cost to run, modify, deploy your own fork). Hosting costs are pay-as-you-scale on the managed services you choose — all have generous free tiers sufficient for a personal portfolio, but hard limits apply:

| Component | Free Tier | Limits / Notes | Unlimited? |
|-----------|-----------|----------------|------------|
| **This repo (AGPL-3.0)** | ✅ 100% free, no fees, commercial use allowed if you share source under AGPL | You host it yourself; no vendor lock | ✅ Unlimited code |
| **GitHub Pages** | ✅ Free for public repos | 1 GB soft limit, 100 GB bandwidth/month, 10 builds/hour; `Actions` free 2000 min/month (private) / unlimited (public) | ❌ Not unlimited — large binaries or private repo traffic can hit quotas |
| **Cloudflare Workers (free)** | ✅ 100k requests/day, 10 ms CPU, 1–128 MB memory, free `workers.dev` subdomain | Paid `Workers Paid` ($5/mo) for 10M requests and 30s CPU; `trycloudflare.com` quick tunnels are **ephemeral** (die on `cloudflared` restart) — use named tunnels for prod | ❌ 100k/day, not unlimited |
| **GitHub API + PAT** | ✅ 5000 requests/hour (authenticated), `deploy-pages` included | `GITHUB_PAT` classic `ghp_` or fine-grained `Contents:RW` expires (90 days); Actions `pages: write` token is ephemeral | ❌ Rate-limited |
| **Ollama (self-hosted)** | ✅ Free, local, no per-token billing | Requires your hardware: ≥8 GB VRAM for 8B Q4_K_M (`llama3.1:8b`), ≥16 GB for 14B, ≥~20 GB for `glm-4.7-flash` 29.9B; performance ~1.8s vague / 14.7s detailed on the demo host; `trycloudflare.com` URL changes each restart | ❌ Bounded by your GPU/RAM and tunnel persistence |
| **n8n (legacy)** | ✅ Self-hosted free | Docker/VM maintenance, DuckDNS renewal — replaced to avoid ops | — |

**Bottom line:** For a low-traffic portfolio (a few publishes/week, <1k visitors/day), you will **never pay** — everything fits in free tiers. At scale (high traffic, frequent publishes, large `out/`), you will hit **Cloudflare 100k/day**, **GitHub Pages bandwidth**, **Ollama VRAM**, and **GitHub API rate limits**. If you need unlimited, self-host the Worker on your own Cloudflare Paid plan or migrate `Ollama` to a persistent VPS with a named tunnel, and mirror Pages to your own CDN.

---

## Project Structure

```
dkr_Portfolio/
├── backend-worker/
│   ├── src/index.js            # Edge handler (CORS, auth, Ollama, GitHub)
│   ├── wrangler.toml           # name, compatibility_date
│   ├── package.json            # wrangler devDep
│   └── .dev.vars               # gitignored: ADMIN_PASSWORD/GITHUB_PAT/OLLAMA_TUNNEL_URL/OLLAMA_MODEL (local dev)
├── src/
│   ├── app/
│   │   ├── page.tsx            # grid, getPosts(), AdminPortal
│   │   ├── layout.tsx          # metadata, antialiased
│   │   └── globals.css         # @tailwind + .markdown-body
│   ├── components/AdminPortal.tsx # Ctrl+Shift+A modal, rawNotes/ollamaUrl/clarifications/skipQuestions
│   └── lib/api.ts              # gray-matter + remark, lenient + date slice, sort by frontmatter date
├── _posts/                     # Portfolio Entries (validated)
│   ├── 2026-08-24-portfolio-update-306.md
│   └── ...
├── scripts/validate-posts.mjs  # CI validator (handles Date + ISO datetime)
├── .github/workflows/deploy.yml # checkout, setup-node 22, npm ci, validate, build, upload-pages-artifact
├── CONTEXT.md                  # Ubiquitous language (Raw Notes/Clarification/Frontmatter/Interview State/Publish)
├── docs/adr/
│   ├── 0001-cloudflare-worker-replaces-n8n.md
│   ├── 0002-ollama-via-tunnel-native-chat.md
│   └── 0003-posts-md-frontmatter-contract.md
├── next.config.mjs             # output: export, basePath: /dkr_Portfolio
├── tailwind.config.ts          # bgBase/cardBg/cardBorder/accent
└── package.json                # next, gray-matter, remark, tailwind
```

---

## ADRs & Domain Language

- `CONTEXT.md:1` — `Portfolio Automation Pipeline` vocabulary: `Raw Notes` (avoid `notes`), `Clarification` (`{question,answer}`), `Clarifications`, `Portfolio Entry` (`_posts/*.md` + mandatory `Frontmatter`), `Admin Portal`, `Interview State` (`needs_answers`/`success`/`error` avoid `needs_more_info`), `Edge Worker`, `Publish`, `Ollama Tunnel` (`OLLAMA_TUNNEL_URL` avoid `OLLAMA_URL`), `GitHub Commit` (`PUT .../contents/_posts/{filename}`).
- `0001` — Worker replaces n8n (ops overhead).
- `0002` — Ollama via Tunnel `POST /api/chat format:json think:false` (not OpenRouter).
- `0003` — Canonical `_posts/*.md` with `---` + CI lint, `content/projects/*.mdx` deleted.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `401 Unauthorized` | `ADMIN_PASSWORD` mismatch vs `wrangler secret` | `echo -n "dkr1a1a" | wrangler secret put ADMIN_PASSWORD` then redeploy |
| `502 tunnel offline` / `AbortError` | `cloudflared` not running, quick tunnel expired, or `glm-4.7-flash` >45s | Restart `ollama serve` + `cloudflared tunnel --url http://localhost:11434`, check `OLLAMA_TUNNEL_URL` ends with `/v1` (worker strips), or increase `AbortSignal.timeout` |
| `ollama_404 model not found` | `OLLAMA_MODEL` not on host (`ollama list`) | `ollama pull glm-4.7-flash:latest` or `wrangler secret put OLLAMA_MODEL -- llm:tag` + client `ollamaUrl` override |
| `validate-posts FAIL date must be YYYY-MM-DD` | LLM emitted `2024-06-23T...` or `js-yaml` Date | Fixed by `normalizeFrontmatter:39` + validator `Date` handling; redeploy worker, ensure `date: "YYYY-MM-DD"` quoted in prompt |
| `Pages` Action `failure` | Malformed `_posts` file committed via old worker | Pull, `node scripts/validate-posts.mjs`, fix frontmatter, push |
| `CORS` blocked | Origin not in `ALLOWED_ORIGINS:1` | Add your domain to `backend-worker/src/index.js:1` and redeploy |
| `Could not create SSL/TLS secure channel` (Windows) | DNS not propagated for `*.workers.dev` | Wait 2–5m after `wrangler deploy`, try `curl -k` or different network |
| `content/projects` missing | Intentionally deleted — use `_posts` | Add new entries via `Admin Portal`, not `content/` |

---

## FAQ

**Can I use a different Ollama model?** Yes — `ollama pull qwen2.5:14b` locally, then either `wrangler secret put OLLAMA_MODEL` or paste `https://your-tunnel/v1` in the modal’s `Ollama URL` field per-request. Demo host only has `glm-4.7-flash:latest`.

**Must I keep `OLLAMA_TUNNEL_URL` secret if I use the UI field?** No — if you always provide `ollamaUrl` ending with `/v1` in the portal, the worker uses the client value and the secret can be empty. Keep the secret as fallback for teammates who leave the field blank.

**Does `Skip Questions` produce lower quality?** Yes — it forces `needs_more_info=false` even when sparse, so missing metrics become `N/A` or hallucinated. Prefer answering, use `Skip` only for quick drafts.

**How is `fab`?** `out/` is ~100 kB first load, `worker` 12 KiB, `Pages` deploy ~55s.

---

## License

**AGPL-3.0** — see `LICENSE:1`. You may use, modify, and deploy freely (even commercially) **provided** you make the complete Corresponding Source (including Worker + site) available to users who interact with it over a network (AGPL §13). In short: free, but copyleft — not MIT/BSD. If you fork for a private portfolio, you still comply by keeping the repo public or offering source on request.

---

*Built with Next.js 15, Cloudflare Workers, Ollama, and GitHub Pages — grilled via `CONTEXT.md` + `docs/adr`.*
