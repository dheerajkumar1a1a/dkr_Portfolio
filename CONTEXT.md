# Portfolio Automation Pipeline

A statically-exported Next.js portfolio (GitHub Pages) with an edge-mediated publishing flow that turns free-text input into versioned markdown via a two-phase interview.

## Language

### Content

**Raw Notes**: Unformatted free-text submitted in phase 1 of the Admin Portal describing a project or achievement.
_Avoid_: notes, body.notes, originalNotes

**Clarification**: A single question/answer pair `{ question: string, answer: string }` collected in phase 2 to fill gaps in Raw Notes.
_Avoid_: answers, QnA, interview_response

**Clarifications**: Ordered collection of Clarifications sent back to the edge for the second LLM pass.
_Avoid_: answers array

**Portfolio Entry**: Single markdown document in `_posts/*.md` with mandatory `---` YAML frontmatter (`title`, `date`, `techStack`, `summary`) and `## Situation/Task/Action/Result` body, rendered as one card on the home page.
_Avoid_: Post, Project, MDX, Item, portfolio-update

**Frontmatter**: The `---`-delimited YAML header of a Portfolio Entry. Must contain `title:string`, `date:YYYY-MM-DD`, `techStack:string[]`, `summary:string`.
_Avoid_: metadata, header

### Pipeline

**Admin Portal**: The `Ctrl+Shift+A` modal (`src/components/AdminPortal.tsx`) that captures Raw Notes and Clarifications and talks to the edge.
_Avoid_: AdminModal, Deployment Pipeline modal

**Interview State**: Edge JSON status discriminating the two-phase flow: `needs_answers` (more input required) | `success` (committed) | `error`.
_Avoid_: needs_more_info, status_ok

**Edge Worker**: Cloudflare Worker at `portfolio-pipeline-worker.<subdomain>.workers.dev` that validates `ADMIN_PASSWORD`, calls Ollama via tunnel, and commits to GitHub.
_Avoid_: backend, server, pipeline worker (generic)

**Publish**: End-to-end sequence: edge auth → Ollama synthesis → GitHub `PUT /contents/_posts/*.md` (with `sha` if exists) → GitHub Actions rebuild → GitHub Pages serve.
_Avoid_: Deploy (ambiguous), Commit (partial), Push

### Infrastructure

**Ollama Tunnel**: Cloudflare Tunnel exposing local Ollama's OpenAI-compatible endpoint (`/v1/chat/completions`) to the Edge Worker via `OLLAMA_TUNNEL_URL`.
_Avoid_: OLLAMA_URL, tunnel, ngrok

**GitHub Commit**: `PUT https://api.github.com/repos/dheerajkumar1a1a/dkr_Portfolio/contents/_posts/{filename}` with base64-encoded Portfolio Entry and optional `sha` for updates.
_Avoid_: push, upload
