/**
 * Utility functions for handling logo image in exports
 */

/**
 * Convert image file to base64 data URL
 */
export async function loadImageAsBase64(imagePath: string): Promise<string> {
  try {
    const response = await fetch(imagePath);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    throw error;
  }
}

/**
 * Load image and get its actual dimensions
 */
export async function getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = imagePath;
  });
}

/**
 * Get logo dimensions for PDF embedding, preserving aspect ratio
 */
export async function getLogoDisplayDimensions(
  imagePath: string = '/JGIL Logo.jpg',
  maxWidth: number = 50,
  maxHeight: number = 30
): Promise<{ width: number; height: number }> {
  try {
    const { width: actualWidth, height: actualHeight } = await getImageDimensions(imagePath);

    // Calculate aspect ratio
    const aspectRatio = actualWidth / actualHeight;

    // Scale to fit within max bounds while preserving aspect ratio
    let displayWidth = maxWidth;
    let displayHeight = maxWidth / aspectRatio;

    // If height exceeds max, scale based on height instead
    if (displayHeight > maxHeight) {
      displayHeight = maxHeight;
      displayWidth = maxHeight * aspectRatio;
    }

    return { width: displayWidth, height: displayHeight };
  } catch (error) {
    console.warn('Could not load image dimensions, using defaults:', error);
    // Fallback to reasonable defaults if image can't be loaded
    // Assuming a typical logo aspect ratio of 16:9
    return { width: maxWidth, height: maxWidth * 0.56 };
  }
}