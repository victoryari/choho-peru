import React from "react";

interface ProtectedImageProps {
  src?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackSrc?: string;
}

export const ProtectedImage: React.FC<ProtectedImageProps> = ({
  src,
  alt,
  className = "max-h-full max-w-full object-contain",
  containerClassName = "relative flex items-center justify-center overflow-hidden select-none",
  fallbackSrc = "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=300"
}) => {
  const imageSource = src || fallbackSrc;

  return (
    <div
      className={`no-select relative group/protect ${containerClassName}`}
      style={{
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none"
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Product Image */}
      <img
        src={imageSource}
        alt={alt}
        referrerPolicy="no-referrer"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        className={`pointer-events-none ${className}`}
        style={{
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none"
        }}
      />

      {/* Protective Transparent Touch Layer */}
      <div
        className="absolute inset-0 z-15 bg-transparent cursor-default select-none"
        style={{
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none"
        }}
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={(e) => {
          // Prevent mobile long-press image saving
          if (e.touches.length > 1) e.preventDefault();
        }}
      />

      {/* Subtle Choho Security Watermark Overlay */}
      <div className="absolute bottom-1 right-1 z-20 opacity-30 group-hover/protect:opacity-60 transition-opacity pointer-events-none select-none text-[8px] font-mono font-black text-amber-400 tracking-tighter bg-slate-950/70 px-1 py-0.5 rounded border border-amber-500/20">
        CHOHO PERÚ ®
      </div>
    </div>
  );
};
