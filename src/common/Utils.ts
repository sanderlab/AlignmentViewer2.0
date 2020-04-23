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

/**
 * Generate a UUID. Modified from:
 * https://stackoverflow.com/questions/105034
 */
export function generateUUIDv4() {
  const x = (([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11) as string;
  return x.replace(/[018]/g, function (c: string) {
    return (
      parseInt(c) ^
      (window.crypto.getRandomValues(new Uint8Array(1))[0] &
        (15 >> (parseInt(c) / 4)))
    ).toString(16);
  });
}

/**
 * Creates an object composed of keys generated from the results of
 * running each element of collection through fn. The corresponding
 * value of each key is an array of the elements responsible for
 * generating the key. (description taken from lodash documentation)
 *
 * The difference between this function and the lodash "groupBy",
 * function is that this returns a Map object, allowing for more complex
 * keys.
 *
 * @param items
 * @param fn
 */
export function mapGroupBy<T1, T2>(
  items: T1[],
  fn: (item: T1) => T2
): Map<T2, T1[]> {
  //{ [key: string]: T[] } {
  return items.reduce((acc, item) => {
    const key = fn(item);
    const existing = acc.get(key) ? acc.get(key)! : [];
    acc.set(key, [...existing, item]);
    return acc;
  }, new Map<T2, T1[]>());
}

/*
//TESTING groupBy
const items = [
  { cat: "x", b: 2 },
  { cat: "x", b: 4 },
  { cat: "y", b: 4 },
];
console.log(groupBy(items, (item) => item.cat));
console.log(groupBy(items, (item) => "" + item.b));
console.log(groupBy(items, (item) => item.cat + item.b));

const barItems = [
  { name: "nick", categoryName: "boy", categoryCssClass: "boyclass" },
  { name: "bob", categoryName: "boy", categoryCssClass: "boyclass" },
  { name: "john", categoryName: "boy", categoryCssClass: "boyclass" },
  { name: "sam", categoryName: "boy", categoryCssClass: "boyclass" },
  { name: "soha", categoryName: "girl", categoryCssClass: "girlclass" },
  { name: "leyla", categoryName: "girl", categoryCssClass: "girlclasses" },
  { name: "raha", categoryName: "girl", categoryCssClass: "girlclass" },
];

const barItemsGrouped = groupBy(barItems, "categoryName");
const allCategoryNames = Object.entries(
  barItems.reduce((acc, bar) => {
    if (!acc[bar.categoryName]) {
      acc[bar.categoryName] = [];
    }
    if (!acc[bar.categoryName].includes(bar.categoryCssClass)) {
      acc[bar.categoryName].push(bar.categoryCssClass);
    }
    return acc;
  }, {} as { [categoryName: string]: string[] })
);

//[...new Set(barItems.map((bar) => [bar.categoryName, bar.categoryCssClass]))];
//const allCategoryNames = [...new Set(tmpobjs.map((bar) => bar.categoryName))];
//const group = groupBy(allCategoryNames, "category");
console.log(allCategoryNames);

//console.log(barItemsGrouped);


/**
 * Returns the unique subset of items that contain the properties sepecified
 * using === for equality.
 * @param items
 * @param properties
 */
/*
export function shallowUnique<T, K extends keyof T>(
  items: T[],
  properties: K[]
): Partial<T>[] {
  return items.reduce((acc, current) => {
    const alreadyAdded = acc.find((item) => {
      //already added?
      return properties.find(
        (prop) => current[prop] && current[prop] !== item[prop]
      )
        ? false
        : true;
    });
    if (!alreadyAdded) {
      return acc.concat([
        properties.reduce((acc, prop) => {
          //pluck only
          if (current[prop]) {
            acc[prop] = current[prop];
          }
          return acc;
        }, {} as Partial<T>),
      ]);
    }
    return acc;
  }, [] as Partial<T>[]);
}

//testing shallowUnique
const items = [
  { cat: "x", b: 2, c: 123 },
  { cat: "x", b: 4, c: 180 },
  { cat: "y", b: 4 },
  { cat: "z", b: 4 },
  { cat: "x", b: 4 },
];
console.log(shallowUnique(items, ["b"]));
console.log(shallowUnique(items, ["cat"]));
console.log(shallowUnique(items, ["c"]));
console.log(shallowUnique(items, ["c", "cat"]));
console.log(shallowUnique(items, ["b", "cat"]));
*/
