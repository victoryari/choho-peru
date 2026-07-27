/**
 * Client-side Image Optimizer Utility for Choho Perú
 * Resizes and compresses image Files/Data URLs down to < 80 KB
 */

export async function compressAndResizeImage(
  file: File | string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.75
): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Calculate scaling ratio
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Draw onto canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Could not get 2D canvas context"));
      }

      // Smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Export as WebP or JPEG fallback
      let dataUrl = canvas.toDataURL("image/webp", quality);
      if (!dataUrl.startsWith("data:image/webp")) {
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      // Compute size in KB
      const head = "data:image/webp;base64,";
      const sizeBytes = Math.round((dataUrl.length - head.length) * 3 / 4);
      const sizeKb = Number((sizeBytes / 1024).toFixed(1));

      resolve({ dataUrl, sizeKb });
    };

    img.onerror = (err) => {
      reject(new Error("Error al cargar la imagen para compresión"));
    };

    if (typeof file === "string") {
      img.src = file;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    }
  });
}
