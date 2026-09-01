# Replace n8n with Cloudflare Worker for portfolio publishing

We replace the self-hosted n8n workflow (`n8n-sh-dkr.duckdns.org`) with a Cloudflare Worker at `portfolio-pipeline-worker.<subdomain>.workers.dev` as the sole edge between `Admin Portal` and GitHub.

`n8n` required Docker updates, DuckDNS renewal, and a local VM. The Worker runs on Cloudflare's edge at zero cost for this volume, keeps the Next.js site statically exported on GitHub Pages (`next.config.mjs:output:"export"`), and collapses secrets to `wrangler secret` (`ADMIN_PASSWORD`, `GITHUB_PAT`, `OLLAMA_TUNNEL_URL`) instead of n8n credential store.

Considered Options: keep n8n, add Vercel Function (requires leaving Pages), keep Worker.
