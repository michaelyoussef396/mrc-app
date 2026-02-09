const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Resize an image file to max 1600px on its longest dimension and compress as JPEG.
 * Uses OffscreenCanvas when available (workers), falls back to regular Canvas.
 */
export async function resizePhoto(file: File | Blob): Promise<Blob> {
  // Load image as bitmap
  const bitmap = await createImageBitmap(file);

  const { width, height } = bitmap;
  let targetWidth = width;
  let targetHeight = height;

  // Scale down if either dimension exceeds MAX_DIMENSION
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      targetWidth = MAX_DIMENSION;
      targetHeight = Math.round((height / width) * MAX_DIMENSION);
    } else {
      targetHeight = MAX_DIMENSION;
      targetWidth = Math.round((width / height) * MAX_DIMENSION);
    }
  }

  // Use OffscreenCanvas if available, otherwise fall back to regular canvas
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context from OffscreenCanvas');
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();
    return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  }

  // Fallback: regular HTMLCanvasElement
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context from canvas');
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}
