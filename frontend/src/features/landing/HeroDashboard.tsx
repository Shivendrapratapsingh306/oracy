import type { CSSProperties } from "react";
import { Portrait } from "@/components/Portrait";
import { ScoreRing } from "@/components/charts/ScoreRing";
import { demoOverallScore, waveBars } from "@/lib/demo-data";
import { siteConfig } from "@/lib/site";

const evaluation: [string, number][] = [
  ["Relevance", 84],
  ["Structure", 72],
  ["Completeness", 68],
];

/** Interview analysis dashboard preview. */
export function HeroDashboard() {
  return (
    <div className="relative mx-auto w-full max-w-[520px] lg:max-w-none">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-line bg-card shadow-lift">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-line" />
            <span className="h-2.5 w-2.5 rounded-full bg-line" />
            <span className="h-2.5 w-2.5 rounded-full bg-line" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Interview room</p>
        </div>

        <div className="relative aspect-[4/4.4] overflow-hidden">
          <Portrait photo={siteConfig.photography.hero} alt="Professional interview candidate with posture, gaze and framing overlay" landmarks />
          <div className="scanline pointer-events-none absolute inset-x-0 top-0 h-px bg-cobalt/70 shadow-[0_0_14px_1px_rgba(40,95,232,0.35)]" aria-hidden="true" />
          <ul className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 p-4">
            {["Posture: upright", "Gaze: on camera", "Framing: centred"].map((c) => (
              <li key={c} className="rounded-full border border-line bg-card/85 px-3 py-1.5 text-xs text-ink/90 backdrop-blur">
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-line p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">Voice</p>
            <p className="font-mono text-[11px] text-ink/60">148 wpm · 2 fillers · 1 long pause</p>
          </div>
          <div className="flex h-14 items-center gap-[3px]" aria-hidden="true">
            {waveBars.map((h, i) => (
              <span key={i} className="bar block flex-1 rounded-full bg-cobalt" style={{ height: `${h}%`, opacity: 0.4 + h / 170, "--i": i } as CSSProperties} />
            ))}
          </div>
        </div>
      </div>

      <div className="float mt-4 flex items-center gap-4 rounded-2xl border border-line bg-card/95 p-4 shadow-card backdrop-blur lg:absolute lg:-left-16 lg:top-16 lg:mt-0">
        <ScoreRing value={demoOverallScore} size={92} valueClass="text-3xl" label="" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">Readiness score</p>
        </div>
      </div>

      <div className="mt-4 w-full rounded-2xl border border-line bg-card p-5 text-ink shadow-card lg:absolute lg:-right-6 lg:bottom-28 lg:mt-0 lg:w-64">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">Answer evaluation</p>
        <ul className="mt-3 space-y-3">
          {evaluation.map(([label, value]) => (
            <li key={label}>
              <div className="flex justify-between text-xs font-medium">
                <span>{label}</span>
                <span className="font-mono">{value}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-cobalt" style={{ width: `${value}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
