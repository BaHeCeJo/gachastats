"use client";

type Props = {
  isHidden?: boolean;
};

export default function GSBackground({ isHidden }: Props) {
  return (
    <div className={`fixed inset-0 pointer-events-none z-[2] flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${isHidden ? 'opacity-0' : 'opacity-100'}`}>
      {/* Subtle Watermark */}
      <div className="opacity-[0.05] dark:opacity-[0.08]">
        <svg
          viewBox="0 0 800 400"
          className="w-[85vw] h-auto max-w-[1400px] fill-none stroke-[16] overflow-visible"
          strokeLinecap="square"
          strokeLinejoin="miter"
        >
          {/* The "G" Body */}
          <path 
            d="M 350 100 H 250 A 100 100 0 1 0 250 300 H 350 V 230" 
            className="stroke-black dark:stroke-white" 
          />
          
          {/* The Crossbar + "S" */}
          <path 
            d="M 250 200 H 350 H 500 Q 540 200 540 165 V 155 Q 540 130 500 130 H 420 Q 380 130 380 105 V 95 Q 380 60 420 60 H 540" 
            className="stroke-[#22c55e]" 
          />
        </svg>
      </div>
    </div>
  );
}
