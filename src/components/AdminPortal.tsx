"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

const WEBHOOK_URL =
  "https://n8n-sh-dkr.duckdns.org/webhook/portfolio-update";

type Status = "idle" | "loading" | "success" | "error";

export default function AdminPortal() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const close = useCallback(() => {
    setOpen(false);
    setMessage("");
    if (status === "success") {
      setNotes("");
      setPassword("");
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, password }),
      });

      const data: unknown = await res.json().catch(() => null);
      const succeeded =
        res.ok &&
        typeof data === "object" &&
        data !== null &&
        (data as { status?: unknown }).status === "success";

      if (!succeeded) {
        const serverMessage =
          typeof data === "object" &&
          data !== null &&
          typeof (data as { message?: unknown }).message === "string"
            ? (data as { message: string }).message
            : `Request failed (${res.status})`;
        throw new Error(serverMessage);
      }

      setStatus("success");
      setMessage("Success! Reload the page in ~30 seconds to see your new post.");
      setNotes("");
      setPassword("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (!open) return null;

  const busy = status === "loading";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-cardBorder bg-cardBg p-8 text-white shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Deployment Pipeline</h2>
        <p className="mt-1 mb-6 text-xs text-zinc-400">
          AI will automatically structure these raw notes.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Upgraded the Android app architecture using Gradle 9.5..."
            required
            disabled={busy}
            rows={5}
            className="mb-4 w-full resize-y rounded-lg border border-cardBorder bg-black/40 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-accent disabled:opacity-50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin Password"
            required
            disabled={busy}
            className="mb-4 w-full rounded-lg border border-cardBorder bg-black/40 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full cursor-pointer rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Processing…" : "Process & Deploy"}
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
