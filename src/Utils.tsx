/**
 * Convert any valid color string into a hex code and RGB
 * value using the browser
 * taken from
 * https://stackoverflow.com/questions/1573053/javascript-function-to-convert-color-names-to-hex-codes/24390910
 * and
 * https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
 * @param str
 */
export function stringToColor(
  str: string
): {
  hex: string;
  rgb: { red: number; green: number; blue: number };
} {
  try {
    document.createElement("canvas");
    const ctx = document.createElement("canvas").getContext("2d");
    ctx!.fillStyle = str;
    const hex = ctx?.fillStyle!;

    var rgbaResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)!;
    return {
      hex: hex,
      rgb: {
        red: parseInt(rgbaResult[1], 16),
        green: parseInt(rgbaResult[2], 16),
        blue: parseInt(rgbaResult[3], 16)
      }
    };
  } catch (err) {
    throw new Error("Bad color string: " + str + ' - error: "' + err + '"');
  }
}

/**
 * Convert a hex string into RGB
 * taken from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
 * @param hex
 * @returns an RGB object that contains the keys red, green, and blue and values
 *          corresponding to the hex parameter.
 
export function hexOrColorNameToRgb(
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
  throw new Error("Bad Hex: " + hex);
}
*/
