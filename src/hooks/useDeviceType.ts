import { useState, useEffect } from "react";

export type DeviceType = "desktop" | "tablet" | "mobile";

export interface DeviceInfo {
  type: DeviceType;
  label: string;
  sublabel: string;
  isTablet: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  orientation: "portrait" | "landscape";
  width: number;
  height: number;
  os: string;
  model: string;
}

export function detectDevice(): DeviceInfo {
  if (typeof window === "undefined") {
    return {
      type: "desktop",
      label: "PC Escritorio",
      sublabel: "Modo Desktop",
      isTablet: false,
      isMobile: false,
      isDesktop: true,
      isTouch: false,
      orientation: "landscape",
      width: 1920,
      height: 1080,
      os: "Windows",
      model: "PC"
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const orientation: "portrait" | "landscape" = width >= height ? "landscape" : "portrait";
  const ua = navigator.userAgent || "";
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isTouch = maxTouchPoints > 0 || "ontouchstart" in window;

  // Detección de iPad (incluso en iPadOS 13+ donde Safari reporta Macintosh pero tiene touch)
  const isIpad =
    /iPad/i.test(ua) ||
    (/Macintosh/i.test(ua) && maxTouchPoints > 1);

  // Detección de Android Tablet (Android sin Mobile en UA)
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);

  // Detección de Windows Touch Tablet
  const isWindowsTablet = /Windows/i.test(ua) && /Touch/i.test(ua) && width <= 1366 && width >= 600;

  // Detección por tamaño de pantalla típico de tablet
  const isTabletResolution = width >= 768 && width <= 1220;

  // Smartphones
  const isIphone = /iPhone/i.test(ua);
  const isAndroidMobile = /Android/i.test(ua) && /Mobile/i.test(ua);
  const isMobileUA = isIphone || isAndroidMobile || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  let type: DeviceType = "desktop";
  let label = "PC Escritorio";
  let sublabel = `${width}×${height} px`;
  let model = "PC";
  let os = "Windows / macOS";

  if (isIpad) {
    type = "tablet";
    label = "Tablet (iPad)";
    sublabel = `iPadOS • ${orientation === "landscape" ? "Horizontal" : "Vertical"}`;
    model = "Apple iPad";
    os = "iPadOS";
  } else if (isAndroidTablet) {
    type = "tablet";
    label = "Tablet Android";
    sublabel = `Android • ${orientation === "landscape" ? "Horizontal" : "Vertical"}`;
    model = "Tablet Android";
    os = "Android";
  } else if (isTabletResolution || isWindowsTablet || (isTouch && width < 1220 && width >= 640)) {
    type = "tablet";
    label = isIpad ? "Tablet (iPad)" : "Tablet";
    sublabel = `${width}×${height} • ${orientation === "landscape" ? "Horizontal" : "Vertical"}`;
    model = isIpad ? "Apple iPad" : isWindowsTablet ? "Tablet Windows" : "Tablet Táctil";
    os = isIpad ? "iPadOS" : /Windows/i.test(ua) ? "Windows" : "Tablet OS";
  } else if (width < 768 || isMobileUA) {
    type = "mobile";
    label = "Móvil";
    sublabel = `${width}×${height} • ${orientation === "landscape" ? "Horizontal" : "Vertical"}`;
    model = isIphone ? "Apple iPhone" : isAndroidMobile ? "Smartphone Android" : "Smartphone";
    os = isIphone ? "iOS" : isAndroidMobile ? "Android" : "Móvil";
  } else {
    type = "desktop";
    label = "PC Escritorio";
    sublabel = `${width}×${height} • Monitor`;
    model = "Estación de Trabajo";
    os = /Windows/i.test(ua) ? "Windows" : /Macintosh/i.test(ua) ? "macOS" : "Linux";
  }

  return {
    type,
    label,
    sublabel,
    isTablet: type === "tablet",
    isMobile: type === "mobile",
    isDesktop: type === "desktop",
    isTouch,
    orientation,
    width,
    height,
    os,
    model
  };
}

export function useDeviceType() {
  const [device, setDevice] = useState<DeviceInfo>(detectDevice);

  useEffect(() => {
    const handleResize = () => {
      setDevice(detectDevice());
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return device;
}
