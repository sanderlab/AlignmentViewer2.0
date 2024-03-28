
/**
 * Get the font family, width and height of the fixed width font used for the
 * alignments
 * inspired by https://stackoverflow.com/questions/118241
 */

export const DEFAULT_FONT_FAMILY = window.getComputedStyle(
  document.body
).getPropertyValue("font-family");


export const MONO_FONT_FAMILY =
  'Monaco, Menlo, "Ubuntu Mono", Consolas, source-code-pro, monospace';
let HIDDEN_DIV: undefined | HTMLDivElement = undefined;
const MONO_FONT_DETAILS_CACHE: Map<
  number, {
    width: number;
    height: number;
  }
> = new Map();

const DEFAULT_FONT_DETAILS_CACHE: Map<
  number, {
    width: number;
    height: number;
  }
> = new Map();

export function getAlignmentFontDetails(fontSize: number, mono: boolean) {

  if(
    (mono && !MONO_FONT_DETAILS_CACHE.has(fontSize)) ||
    (!mono && !DEFAULT_FONT_DETAILS_CACHE.has(fontSize))
  ){
    if (!HIDDEN_DIV) {
      HIDDEN_DIV = document.createElement("div");
      document.body.appendChild(HIDDEN_DIV);
      HIDDEN_DIV.style.position = "absolute";
      HIDDEN_DIV.style.left = "-1000px";
      HIDDEN_DIV.style.top = "-1000px";
      HIDDEN_DIV.innerHTML = "X";
    }
    HIDDEN_DIV.style.fontSize = fontSize + "px";
    HIDDEN_DIV.style.fontFamily = mono 
      ? MONO_FONT_FAMILY
      : "";
    const boundingRect = HIDDEN_DIV.getBoundingClientRect();
    const cache = mono 
      ? MONO_FONT_DETAILS_CACHE
      : DEFAULT_FONT_DETAILS_CACHE;
    cache.set(fontSize, {
      width: boundingRect.width,
      height: boundingRect.height,
    })
  }
  
  return mono 
    ? MONO_FONT_DETAILS_CACHE.get(fontSize)!
    : DEFAULT_FONT_DETAILS_CACHE.get(fontSize)!;
}



const CANVAS_CONTEXT_CACHE = new OffscreenCanvas(1,1).getContext("2d")!;
export function getMaxStringCanvasWidth(props: {
  fontSize: number, 
  stringsToMeasure: string[],
  maxWidthAllowed?: number, //speed up calculation if it goes over this number quits
  fontFamily?: string,
  fontWeight?: "normal" | "bold"
}) {
  const {
    fontSize, 
    maxWidthAllowed,
    stringsToMeasure, 
    fontFamily = DEFAULT_FONT_FAMILY,
    fontWeight = "normal"
  } = props;
  
  CANVAS_CONTEXT_CACHE.font = `${fontSize}px ${fontWeight} ${fontFamily}`;
  var toreturn = 0;
  for(var idx = 0; idx < stringsToMeasure.length; idx++){
    const width = CANVAS_CONTEXT_CACHE.measureText(
      stringsToMeasure[idx]
    ).width;
    toreturn = toreturn < width ? width : toreturn;
    if(maxWidthAllowed && toreturn >= maxWidthAllowed){
      return maxWidthAllowed;
    }
  }
  return Math.ceil(toreturn);
}

//
//NOTE: This is much slower than canvas measurement
//
//export function getMaxStringWidth(props: {
//  fontSize: number, 
//  stringsToTest: string[]
//  fontFamily?: string,
//}) {
//  const {
//    fontSize, 
//    stringsToTest, 
//    fontFamily = DEFAULT_FONT_FAMILY
//  } = props;
//  const tmpElement = document.createElement("div");
//  document.body.appendChild(tmpElement);
//  tmpElement.style.position = "absolute";
//  tmpElement.style.fontFamily = fontFamily;
//  tmpElement.style.left = "-1000px";
//  tmpElement.style.top = "-1000px";
//  tmpElement.style.fontSize = fontSize + "px";
//  
//  var toreturn = 0;
//  for(var idx = 0; idx < stringsToTest.length; idx++){
//    tmpElement.innerHTML = stringsToTest[idx];
//    const width = tmpElement.getBoundingClientRect().width;
//    toreturn = toreturn < width ? width : toreturn;
//  }
//  document.body.removeChild(tmpElement);
//  return toreturn;
//}

// BENCHMARKING
//const keys = Object.keys(columns);
//
//const randomIndiciesToCheck: number[] = [];
//for(var i = 0; i < 1000; i++){
//  randomIndiciesToCheck.push(
//    Math.floor(Math.random() * 23626)
//  );
//}
//const calcAllWidths = (totest: "div" | "canvas") => {
//  const start = performance.now();
//  console.log(`--- ${totest} ---`);
//  for(var i = 0; i < keys.length; i++){
//    const startCol = performance.now();
//    const col = columns[keys[i]];
//      const strsToTest = randomIndiciesToCheck.map((idx)=>{
//        return col.rawData[idx] as string;
//      });
//      const width = totest === "div" 
//        ? getMaxStringWidth({
//            fontSize: fontSize, 
//            stringsToTest: strsToTest //data
//          })
//        : getMaxStringCanvasWidth({
//            fontSize: fontSize, 
//            stringsToMeasure: strsToTest //data
//          })
//    console.log(
//       `- col "${col.initialColumnName}" took ${performance.now() - startCol}ms [max width: ${width}]`
//    );
//  }
//  console.log(`Execution time ${totest}: ${performance.now() - start} ms`);
//}
//calcAllWidths("div");
//calcAllWidths("canvas");