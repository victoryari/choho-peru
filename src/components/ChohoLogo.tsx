import React from "react";

interface ChohoLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  themeMode?: "light" | "dark" | "auto";
}

export const ChohoLogo: React.FC<ChohoLogoProps> = ({
  className = "",
  size = "md",
  showTagline = true
}) => {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20"
  };

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
    xl: "text-5xl"
  };

  const taglineSizes = {
    sm: "text-[8px] px-1.5 py-0.2",
    md: "text-[9.5px] px-2.5 py-0.5",
    lg: "text-[11px] px-3 py-1",
    xl: "text-[13px] px-4 py-1"
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Authentic CHOHO Hexagonal Emblem SVG */}
      <div className={`shrink-0 ${iconSizes[size]} flex items-center justify-center`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          {/* Top Circle */}
          <circle cx="50" cy="18" r="13" fill="#E51920" />
          
          {/* Top-Left Diamond */}
          <rect x="18" y="32" width="18" height="18" rx="2" transform="rotate(45 27 41)" fill="#E51920" />
          
          {/* Top-Right Diamond */}
          <rect x="64" y="32" width="18" height="18" rx="2" transform="rotate(45 73 41)" fill="#E51920" />
          
          {/* Bottom-Left Circle */}
          <circle cx="27" cy="73" r="13" fill="#E51920" />
          
          {/* Bottom-Right Circle */}
          <circle cx="73" cy="73" r="13" fill="#E51920" />
          
          {/* Bottom Center Diamond */}
          <rect x="41" y="69" width="18" height="18" rx="2" transform="rotate(45 50 78)" fill="#E51920" />
        </svg>
      </div>

      {/* Brand Text & Skewed Tagline Badge */}
      <div className="flex flex-col text-left justify-center">
        <div className="flex items-start leading-none">
          <span className={`font-black tracking-tight text-[#E51920] font-sans ${textSizes[size]}`}>
            CHOHO
          </span>
          <span className="text-[10px] md:text-xs font-bold text-[#E51920] ml-0.5 mt-0.5">
            ®
          </span>
        </div>

        {showTagline && (
          <div className="mt-1">
            <div className={`inline-block bg-slate-950 dark:bg-black text-white font-black italic uppercase tracking-wider -skew-x-12 rounded-sm shadow-xs ${taglineSizes[size]}`}>
              <span className="inline-block skew-x-12 font-sans">
                MEJOR QUE EL ORIGINAL
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
