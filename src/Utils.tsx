/**
 * Convert a hex string into RGB
 * taken from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
 * @param hex
 * @returns an RGB object that contains the keys red, green, and blue and values
 *          corresponding to the hex parameter.
 */
export function hexToRgb(
  hex: string
): { red: number; green: number; blue: number } {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      red: parseInt(result[1], 16),
      green: parseInt(result[2], 16),
      blue: parseInt(result[3], 16)
    };
  }
  throw new Error("Bad Hex");
}
