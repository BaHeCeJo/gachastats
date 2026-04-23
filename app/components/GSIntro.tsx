"use client";

import { useEffect, useState, useRef } from "react";
import { useLocalizationParams } from "@/lib/localization";

type Phase = 'idle' | 'drawing' | 'fading' | 'done';

export default function GSIntro() {
  // Use lazy initialization to check session storage during the first render
  // This avoids SSR mismatches and satisfies the "no cascading renders" lint rule.
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem("gs_intro_seen")) {
      return 'done';
    }
    return 'idle';
  });
  
  const [showArrow, setShowArrow] = useState(false);
  const [sPathLength, setSPathLength] = useState(0);
  const [gPathLength, setGPathLength] = useState(0);
  const sPathRef = useRef<SVGPathElement>(null);
  const gPathRef = useRef<SVGPathElement>(null);
  const { t } = useLocalizationParams();

  useEffect(() => {
    if (phase === 'done') {
      // Defer to next task to avoid cascading render error while satisfying hydration
      const t = setTimeout(() => setMounted(true), 0);
      return () => clearTimeout(t);
    }

    // Defer all state updates to next task to satisfy aggressive lint rules
    const tStart = setTimeout(() => {
      setPhase('drawing');
      setMounted(true);
    }, 0);

    const t1 = setTimeout(() => setShowArrow(true), 400);
    const t2 = setTimeout(() => setPhase('fading'), 1600);
    const t3 = setTimeout(() => {
      setPhase('done');
      sessionStorage.setItem("gs_intro_seen", "true");
    }, 2600);

    return () => { 
      clearTimeout(tStart);
      clearTimeout(t1); 
      clearTimeout(t2); 
      clearTimeout(t3); 
    };
  }, [phase]);

  // Effect 2: measure SVG path lengths once the SVG is in the DOM
  useEffect(() => {
    if (!mounted || phase === 'done') return;
    if (sPathRef.current) setSPathLength(sPathRef.current.getTotalLength());
    if (gPathRef.current) setGPathLength(gPathRef.current.getTotalLength());
  }, [mounted, phase]);

  if (!mounted || phase === 'done') return null;

  const sPathData = "M 250 200 H 350 H 500 Q 540 200 540 165 V 155 Q 540 130 500 130 H 420 Q 380 130 380 105 V 95 Q 380 60 420 60 H 540";
  const isFading = phase === 'fading';

  return (
    <div className={`gs-intro-container fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-1000 ease-in-out ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className={`relative w-[800px] h-80 flex flex-col items-center justify-center transition-transform duration-1000 ease-in-out ${isFading ? 'scale-95' : 'scale-100'}`}>
        <svg
          key={gPathLength > 0 ? "animated" : "static"}
          viewBox="0 0 800 400"
          className="w-full h-full fill-none stroke-[28] overflow-visible"
          strokeLinejoin="miter"
          style={{ "--s-length": sPathLength, "--g-length": gPathLength } as React.CSSProperties}
        >
          <path ref={gPathRef} d="M 350 100 H 250 A 100 100 0 1 0 250 300 H 350 V 230" className="gs-path-g stroke-white" strokeLinecap="square" />
          <path ref={sPathRef} d={sPathData} className="gs-path-s stroke-[#22c55e]" strokeLinecap="butt" />
          {showArrow && <path d="M 0 -14 L 24 0 L 0 14 Z" fill="#22c55e" className="arrow-head" />}
        </svg>

        <div className={`absolute -bottom-16 left-1/2 -translate-x-1/2 transition-all duration-700 ease-in-out ${isFading ? 'opacity-0 translate-y-3' : 'opacity-0 gs-text-enter'}`}>
          <div className="flex flex-col items-center text-center">
            <span className="tracking-[2.2em] font-black text-4xl mr-[-2.2em] uppercase text-white">Gacha</span>
            <span className="tracking-[0.8em] font-light text-sm text-[#22c55e] mt-4 uppercase whitespace-nowrap mr-[-0.8em]">
              {t('archivesAnalytics')}
            </span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .gs-intro-container .gs-path-g {
          stroke-dasharray: var(--g-length);
          stroke-dashoffset: var(--g-length);
          animation: drawPath 0.4s linear forwards;
        }
        .gs-intro-container .gs-path-s {
          stroke-dasharray: var(--s-length);
          stroke-dashoffset: var(--s-length);
          animation: drawPath 0.7s linear 0.4s forwards;
        }
        .gs-intro-container .arrow-head {
          offset-path: path("${sPathData}");
          offset-rotate: auto;
          animation: moveArrow 0.7s linear forwards;
        }
        .gs-intro-container .gs-text-enter {
          animation: textEnter 0.6s ease-out 1.2s forwards;
        }
        @keyframes drawPath { to { stroke-dashoffset: 0; } }
        @keyframes moveArrow {
          0%   { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }
        @keyframes textEnter {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
