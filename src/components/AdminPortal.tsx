"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

// Canonical Edge Worker URL — deployed via wrangler deploy
const WORKER_URL = "https://portfolio-pipeline-worker.prtf.workers.dev";

type Status = "idle" | "loading" | "success" | "error";

type Clarification = { question: string; answer: string };

export default function AdminPortal() {
  const [open, setOpen] = useState(false);
  const [rawNotes, setRawNotes] = useState("");
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setStatus("loading");
    setMessage("");

    // Canonical payload per CONTEXT.md: Raw Notes + Clarifications
    const payload = isInterviewMode
      ? {
          password,
          rawNotes: originalNotes,
          clarifications: questions.map(
            (question, i): Clarification => ({
              question,
              answer: answers[i] ?? "",
            })
          ),
        }
      : {
          password,
          rawNotes,
        };

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
            questions.map((question, index) => (
              <div key={`${index}-${question}`} className="mb-4">
                <label
                  htmlFor={`interview-question-${index}`}
                  className="mb-1.5 block text-xs font-medium leading-relaxed text-zinc-200"
                >
                  <span className="mr-1 text-accent">{index + 1}.</span>
                  {question}
                </label>
                <textarea
                  id={`interview-question-${index}`}
                  value={answers[index] ?? ""}
                  onChange={(e) => setAnswer(index, e.target.value)}
                  placeholder="Your answer…"
                  required
                  disabled={busy}
                  rows={2}
                  className={`${inputClasses} resize-y`}
                />
              </div>
            ))}

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
