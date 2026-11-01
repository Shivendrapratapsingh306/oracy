"use client";

import { useInView } from "@/hooks/useInView";

export function ProgressChart({ points }: { points: number[] }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const w = 600;
  const h = 240;
  const padX = 28;
  const padY = 28;
  const min = 40;
  const max = 100;
  const coords = points.map((p, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(points.length - 1, 1);
    const y = h - padY - ((p - min) / (max - min)) * (h - padY * 2);
    return [Number(x.toFixed(1)), Number(y.toFixed(1))] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0]} ${h - padY} L${coords[0][0]} ${h - padY} Z`;

  return (
    <div ref={ref} className={inView ? "is-visible" : ""}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={`Progress across ${points.length} sessions, from ${points[0]} to ${points[points.length - 1]}; not based on completed interviews`}>
        <defs>
          <linearGradient id="pc-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#285FE8" stopOpacity="0.22" />
            <stop offset="1" stopColor="#285FE8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[60, 80, 100].map((g) => {
          const y = h - padY - ((g - min) / (max - min)) * (h - padY * 2);
          return <line key={g} x1={padX} x2={w - padX} y1={y} y2={y} stroke="#E5EBF4" />;
        })}
        <path className="chart-area" d={area} fill="url(#pc-area)" />
        <path className="chart-line" d={line} pathLength={1} fill="none" stroke="#285FE8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill="#FFFFFF" stroke="#285FE8" strokeWidth="2.5" />
            <text x={x} y={h - 6} textAnchor="middle" fontSize="11" fill="#5F6B82" fontFamily="monospace">S{i + 1}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
