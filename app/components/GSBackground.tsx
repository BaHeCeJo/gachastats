"use client";

export default function GSBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden flex items-center justify-center opacity-[0.03] dark:opacity-[0.06]">
      <svg
        viewBox="0 0 800 400"
        className="w-[80vw] h-[40vw] max-w-[1600px] max-h-[800px] fill-none stroke-[20] overflow-visible"
        strokeLinejoin="miter"
      >
        <defs>
          <marker
            id="arrow-triangle-bg"
            viewBox="0 0 10 10"
            refX="0"
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="1"
            markerHeight="1"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 Z" fill="#22c55e" />
          </marker>
        </defs>

        {/* The "G" Body - Stops lower to account for cap extension */}
        <path 
          d="M 350 100 H 250 A 100 100 0 1 0 250 300 H 350 V 230" 
          className="stroke-black dark:stroke-white" 
          strokeLinecap="square" 
          strokeWidth="28"
        />
        
        {/* The Crossbar + "S" */}
        <path 
          d="M 250 200 H 350 H 500 Q 540 200 540 165 V 155 Q 540 130 500 130 H 420 Q 380 130 380 105 V 95 Q 380 60 420 60 H 540" 
          className="stroke-[#22c55e]" 
          strokeLinecap="butt"
          strokeWidth="28"
          markerEnd="url(#arrow-triangle-bg)"
        />
      </svg>
    </div>
  );
}
