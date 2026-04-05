"use client";

import { useState } from "react";

interface EfilingGateProps {
  onSubmit: (username: string) => void | Promise<void>;
  isDispatching: boolean;
}

export function EfilingGate({ onSubmit, isDispatching }: EfilingGateProps) {
  const [username, setUsername] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    await Promise.resolve(onSubmit(username.trim()));
  }

  return (
    <section className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-card">
      <h2 className="font-display text-base font-semibold text-indigo-950">File Your Response Online</h2>
      <p className="mt-2 text-sm text-stone-700">
        We&apos;ll open the court&apos;s e-filing portal in the browser above, pre-fill your
        username, and wait while you enter your password. Then the agent will complete the filing
        for you.
      </p>
      <p className="mt-2 text-xs text-stone-600">
        Don&apos;t have an account?{" "}
        <a
          href="https://courtfiling.net"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-indigo-600 underline hover:text-indigo-800"
        >
          Create a free account at courtfiling.net &rarr;
        </a>
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="efiling-username" className="text-sm font-medium text-stone-800">
            courtfiling.net username
          </label>
          <input
            id="efiling-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username or email"
            className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            required
            disabled={isDispatching}
          />
        </div>

        <button
          type="submit"
          disabled={isDispatching || !username.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDispatching ? "Launching\u2026" : "Start E-Filing"}
        </button>
      </form>
    </section>
  );
}
