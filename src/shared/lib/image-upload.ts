export interface OptimizedImage {
  file: File;
  width: number;
  height: number;
}

interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  crop?: boolean;
  quality?: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The selected file could not be read as an image.'));
    };
    image.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not optimise the image.'))),
      'image/webp',
      quality
    );
  });
}

export async function optimizeImageForUpload(
  file: File,
  { maxWidth = 1600, maxHeight = 1600, crop = false, quality = 0.84 }: OptimizeOptions = {}
): Promise<OptimizedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose a JPG, PNG or WebP image.');
  }
  if (file.type === 'image/svg+xml') {
    throw new Error('Use a JPG, PNG or WebP image instead of SVG.');
  }

  const image = await loadImage(file);
  const targetWidth = Math.min(image.naturalWidth, maxWidth);
  const aspect = crop ? maxWidth / maxHeight : image.naturalWidth / image.naturalHeight;
  const targetHeight = Math.max(1, Math.round(targetWidth / aspect));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image optimisation is not supported in this browser.');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  if (crop) {
    const sourceAspect = image.naturalWidth / image.naturalHeight;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    let sourceX = 0;
    let sourceY = 0;

    if (sourceAspect > aspect) {
      sourceWidth = Math.round(sourceHeight * aspect);
      sourceX = Math.round((image.naturalWidth - sourceWidth) / 2);
    } else {
      sourceHeight = Math.round(sourceWidth / aspect);
      sourceY = Math.round((image.naturalHeight - sourceHeight) / 2);
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );
  } else {
    context.drawImage(image, 0, 0, targetWidth, targetHeight);
  }

  const blob = await toBlob(canvas, quality);
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  const optimized = new File([blob], `${baseName}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  });

  return { file: optimized, width: targetWidth, height: targetHeight };
}
