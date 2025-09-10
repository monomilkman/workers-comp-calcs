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
 * Get logo dimensions for PDF embedding
 */
export function getLogoDisplayDimensions(maxWidth: number = 80, maxHeight: number = 60): { width: number; height: number } {
  // Return standard dimensions for logo display in PDFs
  // These can be adjusted based on actual logo aspect ratio
  return { width: maxWidth, height: maxHeight };
}