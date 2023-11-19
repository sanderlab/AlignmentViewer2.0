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

type NonNullable<T> = T extends null | undefined ? never : T;