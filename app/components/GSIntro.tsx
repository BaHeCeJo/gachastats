"use client";

import { useEffect, useState, useRef } from "react";
import { useLocalizationParams } from "@/lib/localization";

export default function GSIntro() {
  const [isFinished, setIsFinished] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);
  const [showArrow, setShowArrow] = useState(false);
  const [sPathLength, setSPathLength] = useState(0);
  const [gPathLength, setGPathLength] = useState(0);
  const sPathRef = useRef<SVGPathElement>(null);
  const gPathRef = useRef<SVGPathElement>(null);
  const { t } = useLocalizationParams() as any;

  useEffect(() => {
    if (sPathRef.current) {
      setSPathLength(sPathRef.current.getTotalLength());
    }
    if (gPathRef.current) {
      setGPathLength(gPathRef.current.getTotalLength());
    }

    // Sequence timing
    const arrowTimer = setTimeout(() => setShowArrow(true), 400); // 0.4s: G ends, S starts
    const finishTimer = setTimeout(() => setIsFinished(true), 2100);
    const hideTimer = setTimeout(() => setShouldHide(true), 3100);

    return () => {
      clearTimeout(arrowTimer);
      clearTimeout(finishTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (shouldHide) return null;

  const sPathData = "M 250 200 H 350 H 500 Q 540 200 540 165 V 155 Q 540 130 500 130 H 420 Q 380 130 380 105 V 95 Q 380 60 420 60 H 540";

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-1000 ease-in-out ${
        isFinished ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative w-[800px] h-80 flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 800 400"
          className="w-full h-full fill-none stroke-[28] overflow-visible"
          strokeLinejoin="miter"
          style={{ 
            // @ts-ignore
            "--s-length": sPathLength,
            "--g-length": gPathLength 
          } as React.CSSProperties}
        >
          {/* Path 1: The "G" Body (White) */}
          <path
            ref={gPathRef}
            d="M 350 100 H 250 A 100 100 0 1 0 250 300 H 350 V 230"
            className="gs-path-g stroke-white"
            strokeLinecap="square"
          />
          
          {/* Path 2: The Crossbar + "S" (Green) */}
          <path
            ref={sPathRef}
            d={sPathData}
            className="gs-path-s stroke-[#22c55e]"
            strokeLinecap="butt"
          />

          {/* Traveling Tip - Rendered only when needed */}
          {showArrow && (
            <path 
              d="M 0 -14 L 24 0 L 0 14 Z" 
              fill="#22c55e"
              className="arrow-head"
            />
          )}
        </svg>

        <div 
          className={`absolute -bottom-16 left-1/2 -translate-x-1/2 text-white transition-all duration-1000 delay-[1.2s] ${
            isFinished ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="flex flex-col items-center text-center">
            <span className="tracking-[2.2em] font-black text-4xl mr-[-2.2em] uppercase text-white">Gacha</span>
            <span className="tracking-[0.8em] font-light text-sm text-green-500 mt-4 uppercase whitespace-nowrap mr-[-0.8em]">
              {t('archivesAnalytics')}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .gs-path-g {
          stroke-dasharray: var(--g-length);
          stroke-dashoffset: var(--g-length);
          animation: drawG 0.4s linear forwards;
        }

        .gs-path-s {
          stroke-dasharray: var(--s-length);
          stroke-dashoffset: var(--s-length);
          animation: drawS 0.7s linear forwards;
          animation-delay: 0.4s;
        }

        .arrow-head {
          offset-path: path("${sPathData}");
          offset-rotate: auto;
          animation: moveArrow 0.7s linear forwards;
        }

        @keyframes drawG {
          to { stroke-dashoffset: 0; }
        }

        @keyframes drawS {
          0% { opacity: 1; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }

        @keyframes moveArrow {
          0% { offset-distance: 0%; opacity: 1; }
          100% { offset-distance: 100%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
