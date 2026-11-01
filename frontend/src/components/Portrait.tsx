"use client";

import Image from "next/image";
import { useId, useState } from "react";

const BARS = [30, 52, 38, 70, 44, 86, 60, 34, 78, 50, 92, 64, 40, 72, 48, 88, 56, 36, 68, 82, 46, 74, 58, 90, 42, 66, 80, 52, 38, 76, 54, 84];

/**
 * Original abstract illustration used as a stand-in for photography:
 * a soft cobalt head-and-shoulders silhouette over a speech-waveform
 * backdrop, with an optional facial-landmark / posture overlay.
 * Everything here is decorative; no analysis is being run.
 */
export function PortraitArt({ landmarks = false }: { landmarks?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const pts: [number, number][] = [[335, 492], [365, 486], [395, 492], [405, 492], [435, 486], [465, 492], [400, 548], [370, 590], [430, 590], [296, 520], [504, 520], [400, 662]];
  return (
    <svg viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label="Abstract illustration of a candidate silhouette with facial landmark and waveform graphics">
      <defs>
        <radialGradient id={id("bg")} cx="68%" cy="28%" r="85%">
          <stop offset="0" stopColor="#DCE7FD" />
          <stop offset="0.6" stopColor="#EEF3FC" />
          <stop offset="1" stopColor="#F7F9FC" />
        </radialGradient>
        <linearGradient id={id("body")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5C86F0" />
          <stop offset="1" stopColor="#285FE8" />
        </linearGradient>
        <linearGradient id={id("head")} x1="0.2" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#C9D8F8" />
        </linearGradient>
        <linearGradient id={id("fade")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.6" stopColor="#F7F9FC" stopOpacity="0" />
          <stop offset="1" stopColor="#F7F9FC" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      <rect width="800" height="1000" fill={`url(#${id("bg")})`} />

      {BARS.map((h, i) => (
        <rect key={i} x={20 + i * 24.5} y={560 - h * 2.2} width="9" height={h * 4.4} rx="4.5" fill="#285FE8" opacity="0.08" />
      ))}

      {/* shoulders */}
      <path d="M90 1000C100 800 250 735 400 715C550 735 700 800 710 1000Z" fill={`url(#${id("body")})`} opacity="0.92" />
      <path d="M400 735L360 830L400 1000L440 830Z" fill="#FFFFFF" opacity="0.9" />
      {/* neck + head */}
      <path d="M352 630V735C372 752 428 752 448 735V630Z" fill="#B7C9F3" />
      <ellipse cx="400" cy="500" rx="118" ry="150" fill={`url(#${id("head")})`} stroke="#285FE8" strokeOpacity="0.25" />
      <path d="M280 490C262 340 378 292 442 318C514 346 536 424 520 490C502 418 444 384 400 384C350 388 300 424 280 490Z" fill="#151C2C" opacity="0.9" />

      <rect width="800" height="1000" fill={`url(#${id("fade")})`} />

      {landmarks && (
        <g fill="none" stroke="#285FE8" strokeWidth="1.5" opacity="0.95">
          <path d="M335 492L365 486L395 492M405 492L435 486L465 492" strokeOpacity="0.8" />
          <path d="M400 500L388 548H412Z" strokeOpacity="0.55" />
          <path d="M370 590C390 602 410 602 430 590" strokeOpacity="0.8" />
          <path d="M296 520C300 600 340 650 400 662C460 650 500 600 504 520" strokeOpacity="0.4" />
          <path d="M232 770L400 735L568 770" strokeDasharray="6 6" strokeOpacity="0.7" />
          <path d="M365 489L618 470" strokeDasharray="3 6" strokeOpacity="0.9" />
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3.5" fill="#285FE8" stroke="#fff" strokeWidth="1.5" />
          ))}
          <circle cx="232" cy="770" r="5" fill="#fff" stroke="#285FE8" />
          <circle cx="568" cy="770" r="5" fill="#fff" stroke="#285FE8" />
          <circle cx="618" cy="470" r="9" />
          <path d="M60 130V60H130M740 130V60H670M60 870V940H130M740 870V940H670" stroke="#151C2C" strokeWidth="2" strokeOpacity="0.35" />
        </g>
      )}
    </svg>
  );
}

type PortraitProps = {
  photo?: string | null;
  alt?: string;
  landmarks?: boolean;
  className?: string;
};

export function Portrait({ photo, alt = "", landmarks = false, className = "" }: PortraitProps) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const activePhoto = photo && photo !== failedPhoto ? photo : undefined;
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {activePhoto ? (
        <Image
          src={activePhoto}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
          unoptimized
          priority
          onError={() => setFailedPhoto(activePhoto)}
        />
      ) : (
        <PortraitArt landmarks={landmarks} />
      )}
    </div>
  );
}
