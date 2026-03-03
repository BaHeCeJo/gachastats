"use client";

import React, { forwardRef } from "react";

type Props = {
  className?: string;
  animated?: boolean;
  showArrow?: boolean;
  sPathData: string;
  gPathRef?: React.RefObject<SVGPathElement | null>;
  sPathRef?: React.RefObject<SVGPathElement | null>;
  style?: React.CSSProperties;
};

const GSLogo = forwardRef<SVGSVGElement, Props>(({ 
  className = "w-12 h-12", 
  animated = false, 
  showArrow = false,
  sPathData,
  gPathRef,
  sPathRef,
  style
}, ref) => {
  return (
    <svg
      ref={ref}
      viewBox="0 0 800 400"
      className={`${className} fill-none stroke-[28] overflow-visible`}
      strokeLinejoin="miter"
      style={style}
    >
      {/* Path 1: The "G" Body (White) */}
      <path
        ref={gPathRef}
        d="M 350 100 H 250 A 100 100 0 1 0 250 300 H 350 V 230"
        className={`stroke-black dark:stroke-white ${animated ? 'gs-path-g' : ''}`}
        strokeLinecap="square"
      />
      
      {/* Path 2: The Crossbar + "S" (Green) */}
      <path
        ref={sPathRef}
        d={sPathData}
        className={`stroke-[#22c55e] ${animated ? 'gs-path-s' : ''}`}
        strokeLinecap="butt"
      />

      {/* Traveling Tip */}
      {showArrow && (
        <path 
          d="M 0 -14 L 24 0 L 0 14 Z" 
          fill="#22c55e"
          className="arrow-head"
        />
      )}
    </svg>
  );
});

GSLogo.displayName = "GSLogo";

export default GSLogo;
