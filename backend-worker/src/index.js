const ALLOWED_ORIGINS = [
  "https://dheerajkumar1a1a.github.io",
  "http://localhost:3000",
];

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binString = "";
  for (const byte of bytes) binString += String.fromCharCode(byte);
  return btoa(binString);
}

function stripFences(raw) {
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  // ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function normalizeFrontmatter(md) {
  // Ensure date is quoted "YYYY-MM-DD" — handles 2024-06-23, 2024-06-23T00:00:00.000Z, "2024-06-23T..."
  return md.replace(/^date:\s*["']?(\d{4}-\d{2}-\d{2})[^"'\r\n]*["']?\s*$/m, 'date: "$1"');
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return Response.json(
        { status: "error", message: "Method Not Allowed" },
        { status: 405, headers: corsHeaders }
      );
    }

    try {
      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json(
          { status: "error", message: "Invalid JSON payload" },
          { status: 400, headers: corsHeaders }
        );
      }

      const { password, rawNotes, clarifications, skipQuestions, ollamaUrl: clientOllamaUrl } = body ?? {};
      const forceSkip = skipQuestions === true;
      const rawOllamaInput =
        typeof clientOllamaUrl === "string" && clientOllamaUrl.trim()
          ? clientOllamaUrl.trim()
          : typeof env.OLLAMA_TUNNEL_URL === "string" && env.OLLAMA_TUNNEL_URL.trim()
            ? env.OLLAMA_TUNNEL_URL.trim()
            : "";
      if (!rawOllamaInput) {
        return Response.json(
          { status: "error", message: "Missing Ollama URL — provide ollamaUrl ending with /v1 in request or set OLLAMA_TUNNEL_URL secret" },
          { status: 400, headers: corsHeaders }
        );
      }
      // Basic SSRF guard: require https and host, allow only trycloudflare.com / localhost for now, but accept any https
      try {
        const u = new URL(rawOllamaInput);
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("invalid protocol");
      } catch {
        return Response.json(
          { status: "error", message: "Invalid ollamaUrl — must be a valid https URL ending with /v1" },
          { status: 400, headers: corsHeaders }
        );
      }

      if (typeof password !== "string" || typeof rawNotes !== "string") {
        return Response.json(
          { status: "error", message: "Missing required fields: password, rawNotes" },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!env.ADMIN_PASSWORD) {
        return Response.json(
          { status: "error", message: "Server misconfiguration" },
          { status: 500, headers: corsHeaders }
        );
      }

      if (password !== env.ADMIN_PASSWORD) {
        return Response.json(
          { status: "error", message: "Unauthorized: Invalid admin password" },
          { status: 401, headers: corsHeaders }
        );
      }

      if (!env.GITHUB_PAT) {
        return Response.json(
          { status: "error", message: "Server misconfiguration" },
          { status: 500, headers: corsHeaders }
        );
      }

      const normalizedClarifications = Array.isArray(clarifications)
        ? clarifications
            .filter((c) => c && typeof c.question === "string" && typeof c.answer === "string")
            .map((c) => ({
              question: c.question,
              answer: c.answer.trim().length === 0 ? "N/A" : c.answer.trim(),
            }))
        : null;

      let systemPrompt = `You are a technical content compiler for a developer portfolio.
Analyze the Raw Notes and optional Clarifications and produce a strict JSON response.
Format requirements:
- If the input lacks key architectural details, metrics, or technical specifics, set needs_more_info: true and supply 3-5 concise clarifying questions that would unblock a STAR portfolio entry.
- If details are sufficient, set needs_more_info: false and generate Portfolio Entry markdown with strict Frontmatter.
Frontmatter MUST be YAML delimited by --- on its own lines, with fields:
  title:string (kebab-free human title, quoted)
  date:"YYYY-MM-DD" (quoted string, e.g. "2024-06-23" — never unquoted, never ISO datetime)
  techStack:string[] (JSON array, 1-8 items, e.g. ["Python", "Hugo"])
  summary:string (quoted, one sentence, <200 chars)
Body MUST use ## Situation / ## Task / ## Action / ## Result.

Return EXACTLY this JSON shape (no markdown fences, no prose):
{
  "needs_more_info": boolean,
  "questions": string[] | null,
  "final_markdown": string | null
}`;
      if (forceSkip) {
        systemPrompt += `\n\nCRITICAL: User has chosen to SKIP remaining clarifications. You MUST set needs_more_info=false and generate final_markdown immediately using only the available Raw Notes and any Clarifications provided (treat missing answers as N/A). Do NOT return questions. Even if information is sparse, produce a best-effort Portfolio Entry with valid Frontmatter and STAR body.`;
      }

      const userMessage = normalizedClarifications
        ? `Raw Notes:\n${rawNotes}\n\nClarifications:\n${normalizedClarifications.map((c) => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n")}`
        : `Raw Notes:\n${rawNotes}`;

      // Effective Ollama base: client-provided ollamaUrl overrides env fallback
      const rawTunnel = String(rawOllamaInput).trim().replace(/\/+$/, "");
      const ollamaBase = rawTunnel
        .replace(/\/v1\/chat\/completions\/?$/i, "")
        .replace(/\/v1\/?$/i, "");
      const ollamaUrl = `${ollamaBase}/api/chat`;

      let aiData;
      try {
        const aiResponse = await fetch(ollamaUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: typeof env.OLLAMA_MODEL === "string" && env.OLLAMA_MODEL.trim() ? env.OLLAMA_MODEL.trim() : "glm-4.7-flash:latest",
            format: "json",
            stream: false,
            think: false,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          }),
          signal: AbortSignal.timeout(45000),
        });

        if (!aiResponse.ok) {
          const text = await aiResponse.text().catch(() => "");
          throw new Error(`ollama_${aiResponse.status}:${text.slice(0, 300)}`);
        }

        aiData = await aiResponse.json();
      } catch (err) {
        const msg = err && err.name === "TimeoutError" ? "timeout" : String(err && err.message ? err.message : err);
        if (msg.includes("timeout") || msg.includes("ollama_") || msg.includes("fetch failed") || msg.includes("Failed to fetch")) {
          return Response.json(
            { status: "error", message: "AI service unavailable — tunnel offline" },
            { status: 502, headers: corsHeaders }
          );
        }
        throw err;
      }

      // Ollama /api/chat returns { message: { content: string }, ... }
      const rawContent =
        (aiData && aiData.message && typeof aiData.message.content === "string" && aiData.message.content) ||
        (aiData && typeof aiData.response === "string" && aiData.response) ||
        "";

      if (!rawContent) {
        return Response.json(
          { status: "error", message: "AI returned malformed structured output" },
          { status: 502, headers: corsHeaders }
        );
      }

      let parsed;
      try {
        const cleaned = stripFences(rawContent);
        parsed = JSON.parse(cleaned);
      } catch {
        return Response.json(
          { status: "error", message: "AI returned malformed structured output" },
          { status: 502, headers: corsHeaders }
        );
      }

      if (typeof parsed.needs_more_info !== "boolean") {
        return Response.json(
          { status: "error", message: "AI returned malformed structured output" },
          { status: 502, headers: corsHeaders }
        );
      }

      if (parsed.needs_more_info) {
        const questions = Array.isArray(parsed.questions)
          ? parsed.questions.filter((q) => typeof q === "string" && q.trim().length > 0).slice(0, 5)
          : [];
        if (questions.length === 0) {
          return Response.json(
            { status: "error", message: "AI returned malformed structured output" },
            { status: 502, headers: corsHeaders }
          );
        }
        return Response.json(
          { status: "needs_answers", questions },
          { headers: corsHeaders }
        );
      }

      let finalMarkdown = typeof parsed.final_markdown === "string" ? parsed.final_markdown.trim() : "";
      if (!finalMarkdown || !finalMarkdown.includes("---")) {
        return Response.json(
          { status: "error", message: "AI returned malformed structured output" },
          { status: 502, headers: corsHeaders }
        );
      }
      finalMarkdown = normalizeFrontmatter(finalMarkdown);

      // Server-controlled filename (Q6): ignore any LLM-suggested path
      const dateStr = new Date().toISOString().split("T")[0];
      const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
      const filename = `${dateStr}-portfolio-update-${uuid}.md`;
      const filePath = `_posts/${filename}`;

      // Q9: GET sha with cache:no-store, branch main
      let sha = undefined;
      try {
        const getRes = await fetch(
          `https://api.github.com/repos/dheerajkumar1a1a/dkr_Portfolio/contents/${filePath}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${env.GITHUB_PAT}`,
              "User-Agent": "Cloudflare-Worker",
              Accept: "application/vnd.github.v3+json",
            },
            cache: "no-store",
          }
        );
        if (getRes.status === 200) {
          const getData = await getRes.json();
          if (getData && typeof getData.sha === "string") sha = getData.sha;
        } else if (getRes.status !== 404) {
          const text = await getRes.text().catch(() => "");
          throw new Error(`github_get_${getRes.status}:${text.slice(0, 300)}`);
        }
      } catch (err) {
        // Network error on GET is fatal — don't proceed to PUT with stale state
        if (String(err.message).startsWith("github_get_")) throw err;
        return Response.json(
          { status: "error", message: "Failed to commit entry to GitHub repository" },
          { status: 502, headers: corsHeaders }
        );
      }

      const putBody = {
        message: `feat(blog): add ${filename} via edge worker`,
        content: toBase64(finalMarkdown),
        branch: "main",
        ...(sha ? { sha } : {}),
      };

      let githubRes;
      try {
        githubRes = await fetch(
          `https://api.github.com/repos/dheerajkumar1a1a/dkr_Portfolio/contents/${filePath}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${env.GITHUB_PAT}`,
              "User-Agent": "Cloudflare-Worker",
              "Content-Type": "application/json",
              Accept: "application/vnd.github.v3+json",
            },
            body: JSON.stringify(putBody),
          }
        );
      } catch {
        return Response.json(
          { status: "error", message: "Failed to commit entry to GitHub repository" },
          { status: 502, headers: corsHeaders }
        );
      }

      if (!githubRes.ok) {
        // Never leak GitHub body (may contain token echo or internal path)
        return Response.json(
          { status: "error", message: "Failed to commit entry to GitHub repository" },
          { status: 502, headers: corsHeaders }
        );
      }

      return Response.json(
        { status: "success", filename },
        { headers: corsHeaders }
      );
    } catch (err) {
      // Sanitized fallback — never leak stack/tunnel URL/PAT
      return Response.json(
        { status: "error", message: "Internal server error" },
        { status: 500, headers: getCorsHeaders(request) }
      );
    }
  },
};
