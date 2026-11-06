import React from "react";
import { useAppStore } from "../store/useAppStore";

interface ChohoLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  themeMode?: "light" | "dark" | "auto";
  iconOnly?: boolean;
}

export const ChohoLogo: React.FC<ChohoLogoProps> = ({
  className = "",
  size = "md",
  showTagline = true,
  iconOnly = false
}) => {
  const { companySettings } = useAppStore();
  const customLogo = companySettings?.logoUrl;
  const tradeName = companySettings?.tradeName || "CHOHO";
  const slogan = companySettings?.slogan || "MEJOR QUE EL ORIGINAL";

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
    sm: "text-micro px-1.5 py-0.2",
    md: "text-micro px-2.5 py-0.5",
    lg: "text-xs px-3 py-1",
    xl: "text-sm px-4 py-1"
  };

  if (iconOnly) {
    return (
      <div className={`shrink-0 ${iconSizes[size]} flex items-center justify-center select-none ${className}`}>
        {customLogo ? (
          <img
            src={customLogo}
            alt={tradeName}
            className="w-full h-full object-contain rounded-md drop-shadow-xs"
          />
        ) : (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" aria-hidden="true">
            <circle cx="50" cy="18" r="13" fill="var(--brand)" />
            <rect x="18" y="32" width="18" height="18" rx="2" transform="rotate(45 27 41)" fill="var(--brand)" />
            <rect x="64" y="32" width="18" height="18" rx="2" transform="rotate(45 73 41)" fill="var(--brand)" />
            <circle cx="27" cy="73" r="13" fill="var(--brand)" />
            <circle cx="73" cy="73" r="13" fill="var(--brand)" />
            <rect x="41" y="69" width="18" height="18" rx="2" transform="rotate(45 50 78)" fill="var(--brand)" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Custom Logo Image or Authentic CHOHO Hexagonal Emblem SVG */}
      <div className={`shrink-0 ${iconSizes[size]} flex items-center justify-center`}>
        {customLogo ? (
          <img
            src={customLogo}
            alt={tradeName}
            className="w-full h-full object-contain rounded-md drop-shadow-xs"
          />
        ) : (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" aria-hidden="true">
            {/* Top Circle */}
            <circle cx="50" cy="18" r="13" fill="var(--brand)" />
            {/* Top-Left Diamond */}
            <rect x="18" y="32" width="18" height="18" rx="2" transform="rotate(45 27 41)" fill="var(--brand)" />
            {/* Top-Right Diamond */}
            <rect x="64" y="32" width="18" height="18" rx="2" transform="rotate(45 73 41)" fill="var(--brand)" />
            {/* Bottom-Left Circle */}
            <circle cx="27" cy="73" r="13" fill="var(--brand)" />
            {/* Bottom-Right Circle */}
            <circle cx="73" cy="73" r="13" fill="var(--brand)" />
            {/* Bottom Center Diamond */}
            <rect x="41" y="69" width="18" height="18" rx="2" transform="rotate(45 50 78)" fill="var(--brand)" />
          </svg>
        )}
      </div>

      {/* Brand Text & Skewed Tagline Badge */}
      <div className="flex flex-col text-left justify-center">
        <div className="flex items-start leading-none">
          <span className={`font-black tracking-tight text-brand-fg font-sans ${textSizes[size]}`}>
            {tradeName.replace(/®/g, "")}
          </span>
          <span className="text-xs md:text-xs font-bold text-brand-fg ml-0.5 mt-0.5">
            ®
          </span>
        </div>

        {showTagline && slogan && (
          <div className="mt-1">
            <div className={`inline-block bg-brand text-brand-contrast dark:bg-brand-soft dark:text-brand-fg font-black italic uppercase tracking-wider -skew-x-12 rounded-sm shadow-2xs ${taglineSizes[size]}`}>
              <span className="inline-block skew-x-12 font-sans">
                {slogan}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
