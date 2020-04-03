/**
 * Convert any valid color string into a hex code and RGB
 * value using the built in browser converter.
 * taken from
 * https://stackoverflow.com/questions/1573053/
 * and
 * https://stackoverflow.com/questions/5623838/
 * @param str The string to convert
 * @returns An object that contains the hex and rgb values for that string
 *          Default to black (#000000) if the string is not recognized.
 */
export function stringToColor(
  str: string
): {
  hex: string;
  rgb: { red: number; green: number; blue: number };
} {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx!.fillStyle = str;
  let hex = ctx!.fillStyle!;

  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
  // (I think only necessary in testing, but might catch odd browser behavior)
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return "#" + r + r + g + g + b + b;
  });

  var rgbaResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)!;
  return {
    hex: hex,
    rgb: {
      red: parseInt(rgbaResult[1], 16),
      green: parseInt(rgbaResult[2], 16),
      blue: parseInt(rgbaResult[3], 16),
    },
  };
}
