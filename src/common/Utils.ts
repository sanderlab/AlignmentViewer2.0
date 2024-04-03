import { useCallback, useEffect, useRef, useState } from "react";

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
export function stringToColor(str: string) {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx!.fillStyle = str;
  let hex = ctx!.fillStyle!;

  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  // https://stackoverflow.com/questions/5623838
  // (I think only necessary in testing, but might catch odd browser behavior)
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return "#" + r + r + g + g + b + b;
  });

  var rgbaResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)!;
  return {
    hexString: hex,
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
 * Custom state function that enables a function call only
 * after the state has been updated. Necessary when attempting
 * to track the mouse movement in e.g., the minimap - otherwise 
 * redux store is updated and new props are generated / passed 
 * before the state registers.
 * taken directly from https://stackoverflow.com/questions/54954091
 * @param initialState 
 * @returns 
 */
export function useStateCallback<T>(
  initialState: T
): [T, (state: T, cb?: (state: T) => void) => void] {
  const [state, setState] = useState(initialState);
  const cbRef = useRef<((state: T) => void) | undefined>(undefined); // init mutable ref container for callbacks

  const setStateCallback = useCallback((state: T, cb?: (state: T) => void) => {
    cbRef.current = cb; // store current, passed callback in ref
    setState(state);
  }, []); // keep object reference stable, exactly like `useState`

  useEffect(() => {
    // cb.current is `undefined` on initial render,
    // so we only invoke callback on state *updates*
    if (cbRef.current) {
      cbRef.current(state);
      cbRef.current = undefined; // reset callback after execution
    }
  }, [state]);

  return [state, setStateCallback];
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

/**
 * Array type that requires at least one array element.
 * https://stackoverflow.com/questions/49910889
 */
export type ArrayOneOrMore<T> = {
  0: T;
} & Array<T>;

/**
 * Convert a string to a boolean or number if possible, otherwise
 * return the string.
 * @param val 
 * @returns 
 */
function strToNumberBooleanString(val: string){
  if (['TRUE', 'FALSE'].includes(val.toUpperCase())){
    return val.toUpperCase() === 'TRUE';
  }
  if(+val){ return +val; }
  return val;
}

/**
 * Get all the parameters in the URL. Taken from:
 * https://stackoverflow.com/questions/979975
 */
export function getURLParameters() {
  return window.location.search
    .substring(1)
    .split("&")
    .map((v) => v.split("="))
    .reduce(
      (map, [key, value]) => map.set(
        key, decodeURIComponent(value))//strToNumberBooleanString( decodeURIComponent(value)) )
      ,
      new Map<string, string>()// | boolean | number>()
    );
}

/**
 * Get an Error that represents a parser problem
 */
export function getParseError(parserName: string, errorMessage: string): Error {
  const toReturn = new Error(errorMessage);
  toReturn.name = parserName + " Parse Error";
  return toReturn;
}

/**
 * Create an array of indicies from a start and end index (inclusive of start and end)
 * see https://stackoverflow.com/questions/66858701/
 * @param startIdx 
 * @param endIdx 
 * @returns 
 */
export function startEndIdxToArray(startIdx: number, endIdx: number){
  return Array.from(
    { length: endIdx - startIdx + 1 },
    (_, i) => startIdx + i
  );
}