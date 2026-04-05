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
    <section className="rounded-xl border border-blue-800/50 bg-blue-950/20 p-4">
      <h2 className="text-sm font-semibold text-blue-200">File Your Response Online</h2>
      <p className="mt-2 text-sm text-blue-100/80">
        We&apos;ll open the court&apos;s e-filing portal in the browser above, pre-fill your
        username, and wait while you enter your password. Then the agent will complete the filing
        for you.
      </p>
      <p className="mt-2 text-xs text-blue-300/60">
        Don&apos;t have an account?{" "}
        <a
          href="https://courtfiling.net"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-blue-300"
        >
          Create a free account at courtfiling.net &rarr;
        </a>
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="efiling-username" className="text-xs font-medium text-blue-200">
            courtfiling.net username
          </label>
          <input
            id="efiling-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username or email"
            className="rounded-md border border-blue-800/40 bg-neutral-900 px-3 py-1.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
            disabled={isDispatching}
          />
        </div>

        <button
          type="submit"
          disabled={isDispatching || !username.trim()}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDispatching ? "Launching\u2026" : "Start E-Filing"}
        </button>
      </form>
    </section>
  );
}
