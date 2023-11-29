declare module "*.scss" {
  const content: { [className: string]: string };
  export = content;
}

interface IPosition {
  x: number;
  y: number;
}
interface IRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

type AvailableGlyphs = 
  "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | 
  "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | 
  "U" | "V" | "W" | "X" | "Y" | "Z";

type UpperCaseLetters = 
  "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | 
  "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | 
  "U" | "V" | "W" | "X" | "Y" | "Z";

type NonNullable<T> = T extends null | undefined ? never : T;