import { getPositionalAxisRuler } from "../components/PositionalAxisHook";
import { Alignment } from "./Alignment";
import {
  AlignmentTypes, 
  IColorScheme, 
  PositionsToStyle, 
  ResidueColoring, 
  resiClassPrefix 
} from "./MolecularStyles";
import { AminoAcid, Nucleotide } from "./Residues";
import { startEndIdxToArray } from "./Utils";

const FONT_FAMILY = "monospace";
const FONT_SIZE = "10";

/**
 * Pull the logo dom element off the page, clean up the dom a bit, add styling
 * and intiate a download.
 * @param style 
 */
export function downloadBarplotSVG(props: {
  alignment: Alignment;
  svgId: string;
  x?: number; 
  y?: number;
  width?: number;
  height?: number;
  positionalAxis?: {
    numPos: number;
    posHeight: number;
    posWidth: number;
    spaceBtwBarplotAndPositionalAxis: number;
  };
  svgFilename?: string;
}){
  const {
    alignment,
    svgFilename
  } = props;

  const barplotString = getBarplotSvgString(props);
  if(barplotString){
    var url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(barplotString)}`;
    var link = document.createElement("a");
    link.download = svgFilename ? svgFilename : `barplot_${alignment.getName()}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};


/**
 * Pull the logo dom element off the page, clean up the dom a bit, add styling
 * and intiate a download.
 * @param style 
 */
export function downloadLogoSVG(props: {
  svgId: string,
  alignment: Alignment, 
  alignmentType: AlignmentTypes,
  colorScheme: IColorScheme,
  positionsToStyle: PositionsToStyle,
  positionalAxis?: {
    numPos: number;
    posHeight: number;
    posWidth: number;
    spaceBtwBarplotAndPositionalAxis: number;
  };
  svgFilename?: string;
}){
  const {
    alignment,
    svgFilename
  } = props;

  const logoString = getLogoSvgString(props);
  if(logoString){
    var url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoString)}`;
    var link = document.createElement("a");
    link.download = svgFilename ? svgFilename : `logo_${alignment.getName()}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * From scratch generation of an alignment svg.
 * @param props 
 */
export function downloadFullViewportSVG(props: {
  alignment: Alignment, 
  svgFilename?: string;
} & Parameters<typeof getFullViewportSvgString>[0]){

  const {
    alignment,
    svgFilename
  } = props;

  const alignmentString = getFullViewportSvgString(props);
  var url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(alignmentString)}`;
  var link = document.createElement("a");
  link.download = svgFilename ? svgFilename : `msa_${alignment.getName()}.svg`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

//
//
// non-exposed methods
//
//
//const getBarplotSvgString = (props: {
//  svgId: string;
//  positionalAxis?: {
//    numPos: number;
//    posHeight: number;
//    posWidth: number;
//    spaceBtwBarplotAndPositionalAxis: number;
//  };
//  x: number;
//  y: number;
//  width: number;
//  height: number;
//}) =>{
//
//  const {
//    svgId,
//    positionalAxis,
//    x,
//    y,
//    width,
//    height
//  } = props;
//  
//  const barplotHeight = !positionalAxis 
//    ? height 
//    : height - 
//      positionalAxis.spaceBtwBarplotAndPositionalAxis -
//      positionalAxis.posHeight;
//
//  const svgBarplotElement = document.getElementById(svgId);
//  if (!svgBarplotElement){
//    console.error(
//      `ERROR: no barplot (no elements with '${svgId}' found on the page)`
//    );
//    return undefined;
//  }
//  const svgElement = svgBarplotElement.cloneNode(true) as SVGElement;
//  const placeholders = svgElement.getElementsByClassName("interaction-placeholder");
//  for (var i = placeholders.length - 1; i >= 0; --i) {
//    placeholders[i].remove();
//  }
//  svgElement.removeAttribute("style");
//  svgElement.setAttribute("width", `${width}`);
//  svgElement.setAttribute("height", `${barplotHeight}`);
//  svgElement.setAttribute("x", `${x}`);
//  svgElement.setAttribute("y", `${y}`);
//
//  if(positionalAxis){
//    const positionalAxisText = getPositionalAxisRuler(positionalAxis.numPos);
//    const positionalTextElem = [
//      `<svg>`
//      `<g transform="translate(${x}, ${height-positionalAxis.posHeight})">`,
//        ...positionalAxisText.split("").map((char, charIdx)=>{
//          return [
//            '<text ',
//              `dx="${charIdx*positionalAxis.posWidth}"`,
//              'font-family="monospace"',
//              'font-size="10px"',
//              `dominant-baseline="hanging"`,
//              `text-anchor="start"`,
//              `fill="black">${char}</text>`
//          ].join(" ");
//        }),
//      `</g></svg>`
//    ].join(" ")
//
//  }
//
//  return svgElement.outerHTML;
//}

const getPositionAxisString = (positionalAxis: {
  numPos: number;
  posHeight: number;
  posWidth: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) => {

  const {
    numPos,
    posHeight,
    posWidth,
    x=0, 
    y=0,
    width=numPos * posWidth,
    height=posHeight
  } = positionalAxis;

  const positionalAxisText = getPositionalAxisRuler(positionalAxis.numPos);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 ${numPos * posWidth} ${posHeight}" 
          x="${x}" y="${y}" width="${width}" height="${height}">`,
      ...positionalAxisText.split("").map((char, charIdx)=>{
        return [
          '<text ',
            `dx="${charIdx * posWidth}"`,
            `font-family="${FONT_FAMILY}"`,
            `font-size="${FONT_SIZE}"`,
            `dominant-baseline="hanging"`,
            `text-anchor="start"`,
            `fill="black">${char}</text>`
        ].join(" ");
      }),
    `</svg>`
  ].join(" ");
}

/**
 * 
 *   <svg 
 *     x={props.x} y={props.y}
 *     width={props.width } height={props.height}/>
 *    <svg from SVG element/>
 *    <svg positionalAxis [generated by this function]/>
 *   </svg>
 * @param svgElem 
 * @param positionalAxis 
 * @returns 
 */
const injectPositionalAxisIntoSVG = (props: {
  svgElement: SVGElement,
  positionalAxis: {
    numPos: number;
    posHeight: number;
    posWidth: number;
    spaceBtwBarplotAndPositionalAxis: number;
  },
  x?: number,
  y?: number,
  width?: number,
  height?: number,
}) => {
  const {
    svgElement,
    positionalAxis,
    x=0, 
    y=0,
    width=positionalAxis.numPos * positionalAxis.posWidth, 
    height=100,
  } = props;

  const {
    numPos,
    posWidth,
    posHeight,
    spaceBtwBarplotAndPositionalAxis
  } = positionalAxis;

  svgElement.setAttribute("y", "0");
  svgElement.setAttribute("x", "0");
  svgElement.setAttribute("width", `${numPos * posWidth}`); //same as position string
  svgElement.setAttribute("height", `${height - posHeight - spaceBtwBarplotAndPositionalAxis}`);
  const axisString = getPositionAxisString({
    ...positionalAxis,
    x: 0, 
    y: height - posHeight,
    width: numPos * posWidth, 
    height: posHeight
  });
  return [
    `<svg x="${x}" y="${y}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`,
    svgElement.outerHTML,
    axisString,
    `</svg>`
  ].join("\n");
}

/**
 * Extract the SVG directly from the page, remove extraneous
 * elements (e.g., interaction elements) and convert to a
 * string. Also, update the x and y and width and height if props
 * are provided. Final SVG output if not positionalAxis is 
 * requested looks like:
 *   <svg barplot [directly from page]
 *     x={props.x} y={props.y}
 *     width={props.width } height={props.height}/>
 * 
 * If the positionalAxis parameter is provided, generates a
 * positional axis and adds it directly under the barplot, nesting
 * the svg elements with the final SVG output like:
 *   <svg 
 *     x={props.x} y={props.y}
 *     width={props.width } height={props.height}/>
 *    <svg barplot [directly from page]/>
 *    <svg positionalAxis [generated by this function]/>
 *   </svg>
 * 
 * @param props 
 * @returns 
 */
const getBarplotSvgString = (props: {
  svgId: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  positionalAxis?: {
    numPos: number;
    posHeight: number;
    posWidth: number;
    spaceBtwBarplotAndPositionalAxis: number;
  };
}) => {

  const {
    svgId,
    x, 
    y, 
    width, 
    height,
    positionalAxis
  } = props;

  const svgBarplotElement = document.getElementById(svgId);
  if (!svgBarplotElement){
    console.error(
      `ERROR: no barplot (no elements with '${svgId}' found on the page)`
    );
    return undefined;
  }

  const svgElement = svgBarplotElement.cloneNode(true) as SVGElement;

  //remove interaction elements
  const placeholders = svgElement.getElementsByClassName("interaction-placeholder");
  for (var i = placeholders.length - 1; i >= 0; --i) placeholders[i].remove();

  //remove classnames
  ["g", "rect"].forEach((tagName) => {
    const elems = svgElement.getElementsByTagName(tagName);
    for (var i = elems.length - 1; i >= 0; --i) elems[i].removeAttribute("class");
  })
  svgElement.removeAttribute("style");

  if(positionalAxis){
    return injectPositionalAxisIntoSVG({
      svgElement, positionalAxis, x, y, width, height
    });
  }
  
  //don't remove from element if caller doesn't want to override.
  if(x !== undefined) svgElement.setAttribute("x", `${x}`);
  if(y !== undefined) svgElement.setAttribute("y", `${y}`);
  if(width !== undefined) svgElement.setAttribute("width", `${width}`);
  if(height !== undefined) svgElement.setAttribute("height", `${height}`);
  return svgElement.outerHTML;
}



/**
 * Get a string representation of the svg logo. Appropriate for immediate
 * download or for insertion into a larger svg.
 * TODO: optimize sizing a bit better, e.g., remove classnames.
 * @param props 
 * @returns 
 */
const getLogoSvgString = (props: {
  svgId: string,
  alignment: Alignment, 
  alignmentType: AlignmentTypes;
  colorScheme: IColorScheme;
  positionsToStyle: PositionsToStyle,
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  positionalAxis?: {
    numPos: number;
    posHeight: number;
    posWidth: number;
    spaceBtwBarplotAndPositionalAxis: number;
  };
}) =>{
  const {
    svgId,
    alignmentType,
    colorScheme,
    positionsToStyle,
    x,
    y,
    width,
    height,
    positionalAxis
  } = props;

  //const svgLogoElements = document.getElementsByClassName("av2-sequence-logo");
  const svgLogoElement = document.getElementById(svgId);
  if (!svgLogoElement){
    console.error(
      `ERROR: no logo (no elements id '${svgId}' found on the page)`
    );
    return undefined;
  }

  const svgElement = svgLogoElement.cloneNode(true) as SVGElement;
  svgElement.removeAttribute("style");

  //
  //1. remove the interaction placeholder rectangles
  //
  const placeholders = svgElement.getElementsByClassName("interaction-placeholder");
  for (var i = placeholders.length - 1; i >= 0; --i) {
    placeholders[i].remove();
  }

  //
  // 2. iterate and set style on every path based on attached classes and positionsToStyle
  //
  const moleculeClass = alignmentType === AlignmentTypes.AMINOACID 
    ? AminoAcid 
    : Nucleotide;

  const defaultColor = moleculeClass.UNKNOWN.colors.get(
    colorScheme
  )?.get(
    ResidueColoring.NO_BACKGROUND
  )?.letterColor.hexString;
  
  Array.from(svgElement.getElementsByTagName("g")).forEach((g) => {
    Array.from(g.getElementsByTagName("path")).forEach(path=>{
      //a bit hacky if logo format every changes ..
      //classInfo expected to look like:
      //    ["resi_A"], ["resi_A", "q"], ["resi_A", "c"], ["resi_A", "q", "c"]
      //we are pulling the field names from the scss file, but signifnicant changes
      //will break this code
      const classInfo = path.getAttribute("class")?.split(" ")!;
      const letter = classInfo.find(s => s.startsWith(resiClassPrefix))!.slice(-1);
      const isQuery = classInfo.includes(PositionsToStyle.QUERY.shortClassname!);
      const isConsensus = classInfo.includes(PositionsToStyle.CONSENSUS.shortClassname!);

      const colorIfStyled = colorScheme.colors[letter]
        ? colorScheme.colors[letter]
        : defaultColor;

      const fill =
        positionsToStyle === PositionsToStyle.ALL
          ? colorIfStyled
          : positionsToStyle === PositionsToStyle.QUERY && isQuery
            ? colorIfStyled
            : positionsToStyle === PositionsToStyle.QUERY_DIFF && !isQuery
              ? colorIfStyled
              : positionsToStyle === PositionsToStyle.CONSENSUS && isConsensus
                ? colorIfStyled
                : defaultColor

      path.setAttribute(
        "style", `fill:${fill};`
      )
    })
  });

  //set height width
  if(width !== undefined) svgElement.setAttribute("width", `${width}`);
  if(height !== undefined) svgElement.setAttribute("height", `${height}`);
  if(x) svgElement.setAttribute("x", `${x}`);
  if(y !== undefined) svgElement.setAttribute("y", `${y}`);

  //
  // 3. encode into a string and modify the residue class name. TODO: lots of extraneous
  //    stuff here, e.g., all class names can be removed.
  //
  if(positionalAxis){
    return injectPositionalAxisIntoSVG({
      svgElement, positionalAxis, x, y, width, height
    }).replaceAll(
      resiClassPrefix, "r" //illustrator can't handle underscores in class names
    );
  }
  return svgElement.outerHTML.replaceAll(
    resiClassPrefix, "r" //illustrator can't handle underscores in class names
  )
}

/**
 * Layout:
 *     LOGO
 *     space
 *     POSITIONAL AXIS
 *     space
 *     MSA
 * 
 * 
 * @param props 
 * @returns 
 */
const getFullViewportSvgString = (props: {
  alignment: Alignment, 
  alignmentType: AlignmentTypes, 
  positionsToStyle: PositionsToStyle, 
  residueColoring: ResidueColoring, 
  colorScheme: IColorScheme,

  logoSvgId?: string, // undefined means don't render
  barplotSvgIds?: string[], // undefined or empty means don't render

  includePositionAxis: boolean,
  includeMetadata: boolean,
  startSeqIdx?: number, 
  endSeqIdx?: number,
  logoHeight?: number,
  barplotHeights?: number,
  moleculeHeight?: number,
  moleculeWidth?: number,
  gapBetweenPlots?: number,
}) =>{

  const {
    alignment, 
    alignmentType, 
    colorScheme,
    positionsToStyle, 
    residueColoring, 
    logoSvgId,
    barplotSvgIds = [],
    includePositionAxis,
    includeMetadata,
    endSeqIdx: endIdx,
    startSeqIdx: startIdx = 0,
    moleculeWidth = 7,
    moleculeHeight = 10,

    logoHeight = moleculeHeight*10,
    barplotHeights = moleculeHeight*10,

    gapBetweenPlots = 5
  } = props;

  const startSeqIdx = startIdx;
  const endSeqIdx = endIdx !== undefined 
    ? endIdx
    : alignment.getSequenceCount() > 100 
      ? 99 
      : alignment.getSequenceCount()-1;

  const seqs = alignment.getSequences();
  const exportedSeqs = startEndIdxToArray(startSeqIdx, endSeqIdx).map(
    seqIdx => seqs[seqIdx]
  );
  const maxGenenameCharCount = exportedSeqs.reduce((acc, seq) => {
    return acc > seq.id.length ? acc : seq.id.length;
  }, -1);
  const genenameWidth = maxGenenameCharCount * moleculeWidth;

  //where should things go?
  const BARPLOTS_SPACE_REQ = barplotSvgIds.length < 1
    ? 0
    : barplotSvgIds.length * (barplotHeights + gapBetweenPlots);

  const LOG0_Y_SPACE_REQ = !logoSvgId 
    ? 0 : logoHeight + gapBetweenPlots; //100+5 = 105

  const POSITION_AXIS_Y_SPACE_REQ = !includePositionAxis 
    ? 0 : moleculeHeight + gapBetweenPlots; //10+5 = 15
  
  const X_OFFSETS = includeMetadata ? genenameWidth : 0;
  const offsets = {
    barplots: {
      y: 0,
      x: X_OFFSETS
    },
    logo: {
      y: BARPLOTS_SPACE_REQ, 
      x: X_OFFSETS
    },
    position_axis: {
      y: BARPLOTS_SPACE_REQ + LOG0_Y_SPACE_REQ, 
      x: X_OFFSETS
    },
    msa: {
      y: BARPLOTS_SPACE_REQ + LOG0_Y_SPACE_REQ + POSITION_AXIS_Y_SPACE_REQ, 
      x: X_OFFSETS
    }
  }

  const moleculeClass = alignmentType === AlignmentTypes.AMINOACID 
    ? AminoAcid 
    : Nucleotide;
  
  //Collect all unique letters being exported
  const allLettersInExport = [...new Set( //only take unique set
    [ //make sure to include unknown - this is what is exported for unknown letters,
      //lower case letters, and letters outside positions to style.
      moleculeClass.UNKNOWN.singleLetterCode,
      ...exportedSeqs.map((seq)=>{
        return seq.sequence.split("");
      }).join("")
    ])
  ];

  //Collect unique letters being exported at each position 
  const posidxLetters = new Map<number, string[]>();
  for(let posIdx=0; posIdx < exportedSeqs[0].sequence.length; posIdx++){
    posidxLetters.set(
      posIdx, 
      [...new Set( //only take unique set
        exportedSeqs.reduce((acc, seq) => {
          acc.push(seq.sequence[posIdx]);
          return acc;
        }, [] as string[])
      )]
    );
  }

  //get colors for each letter (position agnostic)
  const letterToColors = allLettersInExport.reduce((acc, letter)=>{
    const molecule = moleculeClass.fromSingleLetterCode(letter);
    const molColorset = molecule.colors.get(colorScheme)!.get(residueColoring)!;
    acc[letter] = {
      letter: letter,
      backgroundColor: molColorset.backgroundColor["hexString"],
      letterColor: molColorset.letterColor["hexString"]
    };
    return acc;
  }, {} as {
    [letter: string]: {
      letter: string,
      backgroundColor: string,
      letterColor: string
    }
  });

  const getIdForLetter = (letter: string, positionIdx?: number) => {
    const baseId = letter === "." 
      ? "dot" 
      : letter==="-" 
        ? "dash" 
        : letter;

    return positionIdx !== undefined && positionsToStyle !== PositionsToStyle.ALL
      ? `${baseId}${positionIdx}` 
      : baseId;
  }

  //
  // (0) get the barplots plots
  //
  const barplotsString = barplotSvgIds.map((svgId, idx) => {
    return getBarplotSvgString({
      svgId: svgId,
      x: offsets.barplots.x,
      y: offsets.barplots.y + (idx * (barplotHeights + gapBetweenPlots)),
      height: barplotHeights,
      width: (alignment.getSequenceLength() * moleculeWidth)
    });
  }).join("");

  //
  // (0) get the logo plot
  //
  const logoString = !logoSvgId ? "" : getLogoSvgString({
    svgId: logoSvgId,
    alignment: alignment, 
    alignmentType: alignmentType,
    colorScheme: colorScheme,
    positionsToStyle: positionsToStyle,
    x: offsets.logo.x,
    y: offsets.logo.y,
    height: logoHeight,
    width: (alignment.getSequenceLength() * moleculeWidth)
  });

  //
  // (1) setup the position axis
  //
  const positionalTextElem = getPositionAxisString({
    numPos: alignment.getSequenceLength(),
    posHeight: moleculeHeight,
    posWidth: moleculeWidth,
    x: offsets.position_axis.x,
    y: offsets.position_axis.y
  });

  //
  // (2) setup the names
  //
  const idElements = exportedSeqs.map((seq, seqIdx) => {
    return [
      //unsure why the width needs to be less than the starting width
      //UPDATE: width is different beause it is a full string rather than broken characters
      //separated out per position as in the matrix. - I had to break up the positional axis
      //to make it exact and we could do so here, but I think having the sequence ids as
      //full strings is more useful.
      `<g transform="translate(${offsets.msa.x - moleculeWidth}, ${offsets.msa.y + (seqIdx * moleculeHeight)})">`,
        '<text text-anchor="end"',
        'font-family="monospace"',
        'font-size="10px"',
        'dominant-baseline="hanging"',
        `fill="black" border="black">${seq.id}</text>`,
      `</g>`
    ].join(" ")
  });


  //
  // (3) generate the definitions for each square - color box + AA/NT code
  //
  const getLetterDef = (
    id: string,
    letter: string,
    bgColor: string, 
    letterColor: string
  ) => {
    const textElem = [
      '<text ',
      'font-family="monospace"',
      'font-size="10px"',
      `x="${moleculeWidth/2}"`,
      `dominant-baseline="hanging"`,
      `text-anchor="middle"`,
      `fill="${letterColor}">${letter}</text>`
    ].join(" ");

    const rectElem = [
      `<rect`,
      `x="0" y="0"`,
      `width="${moleculeWidth}"`,
      `height="${moleculeHeight}"`,
      `fill="${bgColor}"/>`
    ].join(" ");

    return `<g id="${id}">${rectElem}${textElem}</g>`;
  };
  const letterDefs = positionsToStyle === PositionsToStyle.ALL
    ? allLettersInExport.map((letter)=>{
        //option 1: colors are not based on position (i.e., color all)
        const colors = letterToColors[letter];
        return getLetterDef(
          getIdForLetter(letter), //id
          letter,
          colors.backgroundColor as string, 
          colors.letterColor as string
        )
      })
    : Array.from(posidxLetters).map(([posIdx, lettersAtPosition]) => {
        //option 2: colors are based on position (i.e., same as or different than query/consensus)
        const querySeq = alignment.getQuery().sequence;
        const consensusSeq = alignment.getConsensus().sequence;
        const colorArr = lettersAtPosition.map(letter => {
          return (positionsToStyle === PositionsToStyle.QUERY && letter === querySeq[posIdx]) ||
                  (positionsToStyle === PositionsToStyle.QUERY_DIFF && letter !== querySeq[posIdx]) ||
                  (positionsToStyle === PositionsToStyle.CONSENSUS && letter === consensusSeq[posIdx]) ||
                  (positionsToStyle === PositionsToStyle.CONSENSUS_DIFF && letter !== consensusSeq[posIdx])
                  ? letterToColors[letter]
                  : { 
                      ...letterToColors[moleculeClass.UNKNOWN.singleLetterCode],
                      letter: letter //set the letter to be correct with the unknown style
                    };
        });
        return colorArr.map(colors=>{
          return getLetterDef(
            getIdForLetter(colors.letter, posIdx), 
            colors.letter,
            colors.backgroundColor as string, 
            colors.letterColor as string
          )
        }).join("\n");
      });

  //
  // (4) generate the MSA matrix of squares (color box + AA/NT code)
  //
  const msa = exportedSeqs.map((seq, seqIdx)=>{
    return [
      `<g transform="translate(${offsets.msa.x}, ${offsets.msa.y  + (seqIdx * moleculeHeight)})">`,
      ...seq.sequence.split("").map((letter, posIdx)=>{
        return `<use xlink:href="#${getIdForLetter(letter, posIdx)}" x="${posIdx * moleculeWidth}"/>`;
      }),
      `</g>`
    ].join("\n");
  });

  //
  // (3) create the file
  //
  const totalWidth = (
    offsets.msa.x +
    (alignment.getSequenceLength() * moleculeWidth) //width of MSA letters
  );
  const totalHeight = (
    offsets.msa.y +
    ((endSeqIdx-startSeqIdx+1) * moleculeHeight) //MSA: num of sequences * height of sequences
  );
  const fileContentsArr = [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<svg viewBox="0 0 ${totalWidth} ${totalHeight}" 
          xmlns="http://www.w3.org/2000/svg" 
          xmlns:xlink="http://www.w3.org/1999/xlink">`,
    "<defs>",
    ...letterDefs,
    "</defs>",
    barplotsString,
    logoString,
    includePositionAxis ? positionalTextElem : "",
    ...(includeMetadata ? idElements : []),
    ...msa,
    "</svg>"
  ].join("\n");
  return fileContentsArr;
}