"use client";

import GSLogo from "./GSLogo";

type Props = {
  isHidden?: boolean;
};

export default function GSBackground({ isHidden }: Props) {
  const sPathData = "M 250 200 H 350 H 500 Q 540 200 540 165 V 155 Q 540 130 500 130 H 420 Q 380 130 380 105 V 95 Q 380 60 420 60 H 540";

  return (
    <div className={`fixed inset-0 pointer-events-none z-[2] flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${isHidden ? 'opacity-0' : 'opacity-100'}`}>
      {/* Subtle Watermark */}
      <div className="opacity-[0.05] dark:opacity-[0.08]">
        <GSLogo 
          className="w-[85vw] h-auto max-w-[1400px]" 
          sPathData={sPathData} 
        />
      </div>
    </div>
  );
}
