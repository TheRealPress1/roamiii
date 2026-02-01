import type { Area } from 'react-easy-crop';

/**
 * Creates an image element from a URL
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Crops an image to the specified pixel crop area and returns a blob
 * @param imageSrc - The source image URL or data URL
 * @param pixelCrop - The crop area in pixels { x, y, width, height }
 * @param outputSize - The output size in pixels (default 512x512)
 * @returns A Promise that resolves to a PNG blob
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputSize = 512
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas is empty'));
        }
      },
      'image/png',
      0.95
    );
  });
}
