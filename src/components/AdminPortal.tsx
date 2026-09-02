"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

// Canonical Edge Worker URL — deployed via wrangler deploy
const WORKER_URL = "https://portfolio-pipeline-worker.prtf.workers.dev";

type Status = "idle" | "loading" | "success" | "error";

type Clarification = { question: string; answer: string };

export default function AdminPortal() {
  const [open, setOpen] = useState(false);
  const [rawNotes, setRawNotes] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [originalNotes, setOriginalNotes] = useState("");
  const [isInterviewMode, setIsInterviewMode] = useState(false);

  const busy = status === "loading";

  const close = useCallback(() => {
    setOpen(false);
    setMessage("");
    if (status === "success") {
      setRawNotes("");
      setPassword("");
      setQuestions([]);
      setAnswers([]);
      setOriginalNotes("");
      setIsInterviewMode(false);
      setStatus("idle");
    }
  }, [status]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);

  const setAnswer = (index: number, value: string) => {
    setAnswers((prev) => prev.map((answer, i) => (i === index ? value : answer)));
  };

  const toggleSkipSingle = (index: number) => {
    setAnswers((prev) => prev.map((a, i) => (i === index ? (a === "N/A" ? "" : "N/A") : a)));
  };

  const parseResponse = async (
    res: Response
  ): Promise<{ needsAnswers: boolean; questions?: string[] }> => {
    const data: unknown = await res.json().catch(() => null);

    if (typeof data !== "object" || data === null) {
      throw new Error(`Request failed (${res.status})`);
    }

    const result = data as {
      status?: unknown;
      message?: unknown;
      questions?: unknown;
    };

    if (res.ok && result.status === "needs_answers") {
      if (!Array.isArray(result.questions)) {
        throw new Error("Server requested answers but sent no questions.");
      }
      const parsedQuestions = result.questions.filter(
        (q): q is string => typeof q === "string"
      );
      if (parsedQuestions.length === 0) {
        throw new Error("Server requested answers but sent no valid questions.");
      }
      return { needsAnswers: true, questions: parsedQuestions };
    }

    if (res.ok && result.status === "success") {
      return { needsAnswers: false };
    }

    throw new Error(
      typeof result.message === "string"
        ? result.message
        : `Request failed (${res.status})`
    );
  };

  const sendPayload = async (payload: Record<string, unknown>) => {
    if (busy) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const parsed = await parseResponse(res);
      if (parsed.needsAnswers && parsed.questions) {
        setQuestions(parsed.questions);
        setAnswers(new Array(parsed.questions.length).fill(""));
        setOriginalNotes((prev) => (isInterviewMode ? prev : rawNotes));
        setIsInterviewMode(true);
        setStatus("idle");
        setMessage("");
        return;
      }
      setStatus("success");
      setMessage(
        "Entry committed to GitHub. Site update will be live in 2–3 minutes following GitHub Actions build completion."
      );
      setRawNotes("");
      setPassword("");
      setQuestions([]);
      setAnswers([]);
      setOriginalNotes("");
      setIsInterviewMode(false);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedOllamaUrl = ollamaUrl.trim();
    const trimmedOpenRouterKey = openRouterKey.trim();
    const baseProvider = {
      ...(trimmedOllamaUrl ? { ollamaUrl: trimmedOllamaUrl } : {}),
      ...(trimmedOpenRouterKey ? { openRouterKey: trimmedOpenRouterKey } : {}),
    };
    const payload: Record<string, unknown> = isInterviewMode
      ? {
          password,
          rawNotes: originalNotes,
          clarifications: questions.map(
            (question, i): Clarification => ({
              question,
              answer: answers[i] ?? "",
            })
          ),
          ...baseProvider,
        }
      : {
          password,
          rawNotes,
          ...baseProvider,
        };
    await sendPayload(payload);
  };

  const handleSkip = async () => {
    const trimmedOllamaUrl = ollamaUrl.trim();
    const trimmedOpenRouterKey = openRouterKey.trim();
    const payload: Record<string, unknown> = {
      password,
      rawNotes: originalNotes,
      clarifications: questions.map(
        (question, i): Clarification => ({
          question,
          answer: answers[i]?.trim() ? answers[i] : "N/A",
        })
      ),
      skipQuestions: true,
      ...(trimmedOllamaUrl ? { ollamaUrl: trimmedOllamaUrl } : {}),
      ...(trimmedOpenRouterKey ? { openRouterKey: trimmedOpenRouterKey } : {}),
    };
    await sendPayload(payload);
  };

  if (!open) return null;

  const inputClasses =
    "w-full rounded-lg border border-cardBorder bg-black/40 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-accent disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-cardBorder bg-cardBg p-8 text-white shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">
          {isInterviewMode ? "Almost There" : "Deployment Pipeline"}
        </h2>
        <p className="mt-1 mb-6 text-xs text-zinc-400">
          {isInterviewMode
            ? "Answer the questions below so the AI can finish structuring your entry."
            : "AI will automatically structure these raw notes."}
        </p>

        {isInterviewMode && (
          <div className="mb-5 rounded-lg border border-accent/20 bg-accent/10 px-4 py-3 text-xs leading-relaxed text-blue-200">
            Interview mode — {questions.length} question
            {questions.length === 1 ? "" : "s"} pending.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isInterviewMode && (
            <textarea
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="e.g., Upgraded the Android app architecture using Gradle 9.5..."
              required
              disabled={busy}
              rows={5}
              className={`${inputClasses} mb-4 resize-y`}
            />
          )}

          {isInterviewMode &&
            questions.map((question, index) => {
              const isSkipped = answers[index] === "N/A";
              return (
                <div key={`${index}-${question}`} className="mb-4">
                  <label
                    htmlFor={`interview-question-${index}`}
                    className="mb-1.5 block text-xs font-medium leading-relaxed text-zinc-200"
                  >
                    <span className="mr-1 text-accent">{index + 1}.</span>
                    {question}
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      id={`interview-question-${index}`}
                      value={answers[index] ?? ""}
                      onChange={(e) => setAnswer(index, e.target.value)}
                      placeholder={isSkipped ? "Skipped — will deploy as N/A" : "Your answer…"}
                      disabled={busy || isSkipped}
                      rows={2}
                      className={`${inputClasses} flex-1 resize-y disabled:opacity-60`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleSkipSingle(index)}
                      disabled={busy}
                      title={isSkipped ? "Undo skip for this question" : "Skip this question and deploy as N/A"}
                      className={`shrink-0 self-start rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                        isSkipped
                          ? "border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                      }`}
                    >
                      {isSkipped ? "Undo" : "Skip"}
                    </button>
                  </div>
                  {isSkipped && (
                    <p className="mt-1 text-[10px] text-amber-200/70">This question will be sent as “N/A”.</p>
                  )}
                </div>
              );
            })}

          <input
            type="url"
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
            placeholder="Ollama URL ending with /v1 (e.g., https://...trycloudflare.com/v1) — primary, overrides server default"
            disabled={busy}
            className={`${inputClasses} mb-4`}
            pattern="https://.*\/v1\/?"
            title="Must be a https URL ending with /v1"
          />
          <input
            type="password"
            value={openRouterKey}
            onChange={(e) => setOpenRouterKey(e.target.value)}
            placeholder="OpenRouter API key (sk-or-...) — optional fallback if no Ollama URL"
            disabled={busy}
            className={`${inputClasses} mb-4`}
          />
          <p className="mb-4 text-[10px] leading-relaxed text-zinc-500">
            Primary: <span className="text-zinc-300">Ollama URL</span> (self-hosted, preferred). Fallback:{" "}
            <span className="text-zinc-300">OpenRouter key</span> — used only if Ollama URL is empty.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin Password"
            required
            disabled={busy}
            className={`${inputClasses} mb-4`}
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full cursor-pointer rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? "Processing…"
              : isInterviewMode
                ? "Submit Answers & Deploy"
                : "Process & Deploy"}
          </button>
          {isInterviewMode && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={busy}
              className="mt-3 w-full cursor-pointer rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Skip Questions &amp; Deploy Anyway
            </button>
          )}
          <button
            type="button"
            onClick={close}
            className="mt-3 w-full cursor-pointer rounded-lg border border-cardBorder px-4 py-3 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
        </form>

        {message && (
          <p
            className={`mt-4 text-center text-sm font-medium ${
              status === "success" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
