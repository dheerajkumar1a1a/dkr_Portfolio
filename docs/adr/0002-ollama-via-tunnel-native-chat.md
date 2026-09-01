# Ollama via Cloudflare Tunnel using native /api/chat

The `Edge Worker` calls a self-hosted Ollama through a Cloudflare Tunnel (`OLLAMA_TUNNEL_URL`) using its native `POST /api/chat` with `format:"json", stream:false` instead of OpenRouter or Workers AI.

`n8n` previously called `nvidia/nemotron-3-ultra-550b-a55b:free` via OpenRouter (`openRouterApi`). That model cannot run in Ollama, and paying per token defeats the self-hosted constraint. Local `llama3.1:8b` (8 GB VRAM, Q4_K_M) / `qwen2.5:14b` (16 GB VRAM) satisfies the interview JSON contract without egress cost. Native `/api/chat` enforces valid JSON; the Worker still fence-strips and `AbortSignal.timeout(15000)` → `Interview State:error` (`AI service unavailable — tunnel offline`) on timeout.
