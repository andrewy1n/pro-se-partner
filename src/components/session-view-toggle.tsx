"use client";

import { Monitor, LayoutDashboard } from "lucide-react";

export type SessionView = "browser" | "dashboard";

interface SessionViewToggleProps {
  activeView: SessionView;
  onViewChange: (view: SessionView) => void;
}

const tabs: { view: SessionView; label: string; Icon: typeof Monitor }[] = [
  { view: "browser", label: "Live Browser", Icon: Monitor },
  { view: "dashboard", label: "Your Case Dashboard", Icon: LayoutDashboard },
];

export function SessionViewToggle({ activeView, onViewChange }: SessionViewToggleProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
      {tabs.map(({ view, label, Icon }) => {
        const isActive = view === activeView;
        return (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
