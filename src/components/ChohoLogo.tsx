import React from "react";

interface ChohoLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

export const ChohoLogo: React.FC<ChohoLogoProps> = ({
  className = "",
  size = "md",
  showTagline = true
}) => {
  const heights = {
    sm: "h-7",
    md: "h-9",
    lg: "h-12"
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Dynamic Emblem Graphic */}
      <div className={`relative flex items-center justify-center ${heights[size]} aspect-square rounded-xl bg-gradient-to-br from-yellow-400 via-amber-500 to-red-600 p-0.5 shadow-md shadow-amber-500/20`}>
        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center p-1.5 overflow-hidden relative">
          {/* Decorative gear background effect */}
          <svg className="w-full h-full text-amber-400 transform hover:rotate-45 transition-transform duration-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.172-6.828l-1.414 1.414m-11.414 11.414l-1.414 1.414m0-14.242l1.414 1.414m11.414 11.414l1.414 1.414" />
          </svg>
          <span className="absolute font-extrabold text-[10px] text-yellow-300 tracking-tighter">C</span>
        </div>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1 leading-none">
          <span className="font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-500 text-lg md:text-xl font-display">
            CHOHO
          </span>
          <span className="font-extrabold text-xs px-1.5 py-0.5 rounded bg-red-600/90 text-white tracking-wider uppercase">
            PERÚ
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] font-medium text-slate-400 tracking-widest uppercase mt-0.5">
            Cadenas & Transmisión
          </span>
        )}
      </div>
    </div>
  );
};
