interface HitlGateProps {
  instruction: string;
}

export function HitlGate({ instruction }: HitlGateProps) {
  return (
    <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <h2 className="text-sm font-semibold text-amber-200">Action Required</h2>
      <p className="mt-2 text-sm text-amber-100">{instruction}</p>
      <p className="mt-2 text-xs text-amber-300/80">
        {/* TODO: Auto-dismiss this gate once Stage 2 resumes and Agent 9 starts. */}
      </p>
    </section>
  );
}
