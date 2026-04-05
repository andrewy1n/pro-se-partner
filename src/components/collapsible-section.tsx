"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  label,
  defaultOpen = false,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 text-xs text-stone-500 transition-colors hover:text-stone-800"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-stone-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-400" />
        )}
        {label}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
