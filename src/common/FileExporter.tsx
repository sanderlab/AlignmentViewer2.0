import React from "react";

//for generating string of JSX element
//see https://react.dev/reference/react-dom/server/renderToString#removing-rendertostring-from-the-client-code
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

import { getPositionalAxisRuler } from "../components/PositionalAxisHook";
import { Alignment } from "./Alignment";
import {
  AlignmentTypes, 
  AminoAcidAlignmentTypeInstance, 
  AminoAcidColorSchemes, 
  AminoacidColorSchemeInstance,
  NucleotideAlignmentTypeInstance,
  NucleotideColorSchemeInstance, 
  NucleotideColorSchemes, 
  PositionsToStyle, 
  PositionsToStyleInstance, 
  ResidueColoring, 
  ResidueColoringInstance, 
  resiClassPrefix 
} from "./MolecularStyles";
import { AminoAcid, Nucleotide } from "./Residues";
import { startEndIdxToArray } from "./Utils";
import { SequenceSorterInstance } from "./AlignmentSorter";

const CLASSNAME_MSA_TEXT = "msa";
const CLASSNAME_POSITIONAL_AXIS_TEXT = "posaxis";

/**
 * Pull the logo dom element off the page, clean up the dom a bit, add styling
 * and intiate a download.
 * @param style 
 */
export function downloadBarplotSVG(props: {
  alignment: Alignment;
  svgId: string;
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
  svgId: string;
  alignment: Alignment;
  alignmentType: AminoAcidAlignmentTypeInstance | NucleotideAlignmentTypeInstance;
  aaColorScheme?: AminoacidColorSchemeInstance;
  ntColorScheme?: NucleotideColorSchemeInstance;
  positionsToStyle: PositionsToStyleInstance;
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

/**
 * 
 * @param positionalAxis 
 * @returns 
 */
const getPositionAxisString = (positionalAxis: {
  numPos: number;
  posHeight: number;
  posWidth: number;
  width?: number;
  height?: number;
}) => {

  const {
    numPos,
    posHeight,
    posWidth,
    width=numPos * posWidth,
    height=posHeight
  } = positionalAxis;

  const positionalAxisText = getPositionalAxisRuler(positionalAxis.numPos);
  const positionalAxisSVG = (
    <svg xmlns="http://www.w3.org/2000/svg" 
         viewBox={`0 0 ${numPos * posWidth} ${posHeight}`}
         width={width} height={height}>
      {positionalAxisText.split("").map((char, charIdx)=>{
        return (
          <text className={CLASSNAME_POSITIONAL_AXIS_TEXT}
                dx={charIdx * posWidth}
                key={charIdx}>
            {char}
          </text>
        )
      })}
    </svg>
  );

  const div = document.createElement('div');
  const root = createRoot(div);
  flushSync(() => {
    root.render(positionalAxisSVG);
  });
  const toReturn = div.innerHTML;
  root.unmount();
  return toReturn;
}

/**
 * 
 *   <svg 
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
  width?: number,
  height?: number,
}) => {
  const {
    svgElement,
    positionalAxis,
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
    width: numPos * posWidth, 
    height: posHeight
  });


  //return (
  //  <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
  //    {svgElement}
  //    <g transform={`translate(${0}, ${height - posHeight})`}>
  //      {axisString}
  //    </g>
  //  </svg>
  //)

  return [
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`,
    svgElement.outerHTML,
      `<g transform="translate(${0}, ${height - posHeight})">`,
        axisString,
      `</g>`,
    `</svg>`
  ].join("\n");
}

/**
 * Extract the SVG directly from the page, remove extraneous
 * elements (e.g., interaction elements), remove the x and y,
 * and convert to a string. Also, update the width and height 
 * if props are provided. Final SVG output if positionalAxis is 
 * falsy looks like:
 *   <svg barplot [directly from page]
 *     width={props.width } height={props.height}/>
 * 
 * If the positionalAxis parameter is provided, generates a
 * positional axis and adds it directly under the barplot, nesting
 * the svg elements with the final SVG output like:
 *   <svg 
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
  svgElement.removeAttribute("x");
  svgElement.removeAttribute("y");


  if(positionalAxis){
    return injectPositionalAxisIntoSVG({
      svgElement, positionalAxis, width, height
    });
  }
  
  //don't remove from element if caller doesn't want to override.
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
  alignmentType: AminoAcidAlignmentTypeInstance | NucleotideAlignmentTypeInstance;
  aaColorScheme?: AminoacidColorSchemeInstance;
  ntColorScheme?: NucleotideColorSchemeInstance;
  positionsToStyle: PositionsToStyleInstance,
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
    aaColorScheme = AminoAcidColorSchemes.list[0],
    ntColorScheme = NucleotideColorSchemes.list[0],
    positionsToStyle,
    width,
    height,
    positionalAxis
  } = props;

  const colorScheme = alignmentType === AlignmentTypes.AMINOACID
    ? aaColorScheme : ntColorScheme;
  
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

  //
  // 3. encode into a string and modify the residue class name. TODO: lots of extraneous
  //    stuff here, e.g., all class names can be removed.
  //
  if(positionalAxis){
    return injectPositionalAxisIntoSVG({
      svgElement, positionalAxis, width, height
    }).replaceAll(
      resiClassPrefix, "r" //illustrator can't handle underscores in class names
    );
  }
  return svgElement.outerHTML.replaceAll(
    resiClassPrefix, "r" //illustrator can't handle underscores in class names
  )
}

/**
 * get the title string
 * @param title 
 * @param x 
 * @param y 
 * @returns 
 */
const getTitleTextElemString = (
  title: string, 
  x: number, 
  y: number
) => {
  return [
    `<text class="title" x="${x}" y="${y}">${title}:</text>`
  ].join(" ");
} 

/**
 * Get the css for some common elements.
 * @returns the css
 */
const getStylesheet = () => {
  return [
    `<style type="text/css">`,
    [ //the metadata gene ids
      `text.geneid{`,
        `text-anchor: end;`,
        `font-family: monospace;`,
        `font-size: 10px;`,
        `dominant-baseline: hanging;`,
      `}`,
    ].join(""),

    [ //the msa squares
      `text.${CLASSNAME_POSITIONAL_AXIS_TEXT}{`,
        `text-anchor: start;`,
        `font-family: monospace;`,
        `font-size: 10px;`,
        `dominant-baseline: hanging;`,
      `}`,
    //`rect.msa{`, //illustrator doesn't respect x,y,width,height as css (attr only)
      //`x: 0px;`,
      //`y: 0px;`,
      //`width: ${moleculeWidth}px;`,
      //`height: ${moleculeHeight}px;`,
    //`}`,
    ].join(""),

    [ //the msa squares
      `text.${CLASSNAME_MSA_TEXT}{`,
        `text-anchor: middle;`,
        `font-family: monospace;`,
        `font-size: 10px;`,
        `dominant-baseline: hanging;`,
      `}`,
    //`rect.msa{`, //illustrator doesn't respect x,y,width,height as css (attr only)
      //`x: 0px;`,
      //`y: 0px;`,
      //`width: ${moleculeWidth}px;`,
      //`height: ${moleculeHeight}px;`,
    //`}`,
    ].join(""),

    [ //the titles for barplot/logo/query/consenus/position etc
      `text.title{`,
        `text-anchor: end;`,
        `font-family: monospace;`,
        `font-size: 12px;`,
        `font-weight: bold;`,
        `dominant-baseline: middle;`,
      `}`,
    ].join(""),

    `</style>`
  ].join("\n");
};


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
  alignment: Alignment;
  sortBy: SequenceSorterInstance;
  alignmentType: AminoAcidAlignmentTypeInstance | NucleotideAlignmentTypeInstance;
  positionsToStyle: PositionsToStyleInstance;
  residueColoring: ResidueColoringInstance;
  aaColorScheme: AminoacidColorSchemeInstance;
  ntColorScheme: NucleotideColorSchemeInstance;

  logoSvgId?: string; // undefined means don't render
  barplots?: {
    svgId: string;
    title: string;
  }[]; // undefined or empty means don't render

  includePositionAxis?: boolean;
  includeMetadata?: boolean;
  includeConsensus?: boolean;
  includeQuery?: boolean;
  startSeqIdx?: number;
  endSeqIdx?: number;
  logoHeight?: number;
  barplotHeights?: number;
  moleculeHeight?: number;
  moleculeWidth?: number;
  gapBetweenPlots?: number;
}) =>{

  const {
    alignment, 
    sortBy,
    alignmentType, 
    aaColorScheme = AminoAcidColorSchemes.list[0],
    ntColorScheme = NucleotideColorSchemes.list[0],
    positionsToStyle, 
    residueColoring, 
    logoSvgId,
    barplots = [],
    includePositionAxis = true,
    includeMetadata = true,
    includeConsensus = true,
    includeQuery = true,
    endSeqIdx: endIdx,
    startSeqIdx: startIdx = 0,
    moleculeWidth = 7,
    moleculeHeight = 10,

    logoHeight = moleculeHeight*10,
    barplotHeights = moleculeHeight*10,

    gapBetweenPlots = 5
  } = props;

  const colorScheme = alignmentType === AlignmentTypes.AMINOACID
    ? aaColorScheme : ntColorScheme;

  const startSeqIdx = startIdx;
  const endSeqIdx = endIdx !== undefined 
    ? endIdx
    : alignment.getSequenceCount() > 100 
      ? 99 
      : alignment.getSequenceCount()-1;

  const seqs = alignment.getSequences(sortBy);
  const exportedSeqs = startEndIdxToArray(startSeqIdx, endSeqIdx).map(
    seqIdx => seqs[seqIdx]
  );
  const maxGenenameCharCount = exportedSeqs.reduce((acc, seq) => {
    return acc > seq.id.length ? acc : seq.id.length;
  }, -1);
  const genenameWidth = maxGenenameCharCount * moleculeWidth;

  //where should things go?
  const BARPLOTS_SPACE_REQ = barplots.length < 1
    ? 0
    : barplots.length * (barplotHeights + gapBetweenPlots);

  const LOG0_Y_SPACE_REQ = !logoSvgId 
    ? 0 : logoHeight + gapBetweenPlots; //100+5 = 105

  const CONSENSUS_SEQ_Y_SPACE_REQ = !includeConsensus 
    ? 0 : moleculeHeight + gapBetweenPlots; //10+5 = 15

  const QUERY_SEQ_Y_SPACE_REQ = !includeQuery 
    ? 0 : moleculeHeight + gapBetweenPlots; //10+5 = 15

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
    consensus: {
      y: BARPLOTS_SPACE_REQ + LOG0_Y_SPACE_REQ,
      x: X_OFFSETS
    },
    query: {
      y: BARPLOTS_SPACE_REQ + LOG0_Y_SPACE_REQ + CONSENSUS_SEQ_Y_SPACE_REQ,
      x: X_OFFSETS
    },
    position_axis: {
      y: BARPLOTS_SPACE_REQ + LOG0_Y_SPACE_REQ + 
         CONSENSUS_SEQ_Y_SPACE_REQ + QUERY_SEQ_Y_SPACE_REQ, 
      x: X_OFFSETS
    },
    msa: {
      y: BARPLOTS_SPACE_REQ + LOG0_Y_SPACE_REQ + 
         CONSENSUS_SEQ_Y_SPACE_REQ + QUERY_SEQ_Y_SPACE_REQ + 
         POSITION_AXIS_Y_SPACE_REQ, 
      x: X_OFFSETS
    },
    metadata_and_titles: {
      x: X_OFFSETS - moleculeWidth
    }
  }

  //load style stuff
  const moleculeClass = alignmentType === AlignmentTypes.AMINOACID 
    ? AminoAcid 
    : Nucleotide;
  
  const exportedPlusQueryConsSeqs = [
    ...(!includeQuery ? [] : [alignment.getQuery()]),
    ...(!includeConsensus ? [] : [alignment.getConsensus()]),
    ...(exportedSeqs)
  ];

  //Collect all unique letters being exported
  const allLettersInExport = [...new Set( //only take unique set
    [ //make sure to include unknown - this is what is exported for unknown letters,
      //lower case letters, and letters outside positions to style.
      moleculeClass.UNKNOWN.singleLetterCode,
      ...exportedPlusQueryConsSeqs.map((seq)=>{
        return seq.sequence.split("");
      }).join("")
    ])
  ];

  //Collect unique letters being exported at each position 
  const posidxLetters = new Map<number, string[]>();
  for(let posIdx=0; posIdx < exportedPlusQueryConsSeqs[0].sequence.length; posIdx++){
    posidxLetters.set(
      posIdx, 
      [...new Set( //only take unique set
        exportedPlusQueryConsSeqs.reduce((acc, seq) => {
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
  // get the barplots plots
  //
  const barplotsString = barplots.map((barplot, idx) => {
    const barplotsX = offsets.barplots.x;
    const barplotsY = offsets.barplots.y + (idx * (barplotHeights + gapBetweenPlots));
    return [
      !includeMetadata 
        ? ""
        : getTitleTextElemString(
          barplot.title, 
          offsets.metadata_and_titles.x,
          barplotsY + (barplotHeights/2), 
        ),
      `<g transform="translate(${barplotsX}, ${barplotsY})">`,
        getBarplotSvgString({
          svgId: barplot.svgId,
          height: barplotHeights,
          width: (alignment.getSequenceLength() * moleculeWidth)
        }),
      `</g>`
    ].join("");
  }).join("\n");

  //
  // get the logo plot
  //
  const logoString = !logoSvgId 
    ? "" 
    : [
      !includeMetadata 
        ? ""
        : getTitleTextElemString(
          `Logo`, 
          offsets.metadata_and_titles.x,
          offsets.logo.y + (logoHeight/2), 
        ),
      `<g transform="translate(${offsets.logo.x}, ${offsets.logo.y})">`,
        getLogoSvgString({
          svgId: logoSvgId,
          alignment: alignment, 
          alignmentType: alignmentType,
          aaColorScheme: aaColorScheme,
          ntColorScheme: ntColorScheme,
          positionsToStyle: positionsToStyle,
          height: logoHeight,
          width: alignment.getSequenceLength() * moleculeWidth
        }),
      `</g>`
    ].join("");

  //
  // get the the position axis
  //
  const positionAxisString = 
  [
    !includeMetadata 
      ? ""
      : getTitleTextElemString(
        `Position`, 
        offsets.metadata_and_titles.x,
        offsets.position_axis.y + (moleculeHeight/2), 
      ),
    `<g transform="translate(${offsets.position_axis.x},${offsets.position_axis.y})">`,
      getPositionAxisString({
        numPos: alignment.getSequenceLength(),
        posHeight: moleculeHeight,
        posWidth: moleculeWidth
      }),
    `</g>`
  ].join("");

  //
  // [MSA] prepare the genename / geneid metadata
  //
  const idElements = exportedSeqs.map((seq, seqIdx) => {
    return [
      //unsure why the width needs to be less than the starting width
      //UPDATE: width is different beause it is a full string rather than broken characters
      //separated out per position as in the matrix. - I had to break up the positional axis
      //to make it exact and we could do so here, but I think having the sequence ids as
      //full strings is more useful.
      `<g transform="translate(${offsets.metadata_and_titles.x}, ${offsets.msa.y + (seqIdx * moleculeHeight)})">`,
        `<text class="geneid">${seq.id}</text>`,
      `</g>`
    ].join("")
  });

  //
  // [MSA] generate the definitions for each square - color box + AA/NT code
  //
  const getLetterDef = (
    id: string,
    letter: string,
    bgColor: string, 
    letterColor: string
  ) => {
    const textElem = [
      `<text class="${CLASSNAME_MSA_TEXT}"`,
      `x="${moleculeWidth/2}"`, //only works as attribute with illustrator (not css)
      `fill="${letterColor}">${letter}</text>`
    ].join(" ");

    const rectElem = [
      `<rect`,
      `width="${moleculeWidth}px"`, //only works as attribute with illustrator (not css)
      `height="${moleculeHeight}px"`, //only works as attribute with illustrator (not css)
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
        const colorArr = lettersAtPosition.reduce((acc, letter) => {
          const letterColor = letterToColors[letter];
          const letterAtPosMatchesStyle = (
            (positionsToStyle === PositionsToStyle.QUERY && letter === querySeq[posIdx]) ||
            (positionsToStyle === PositionsToStyle.QUERY_DIFF && letter !== querySeq[posIdx]) ||
            (positionsToStyle === PositionsToStyle.CONSENSUS && letter === consensusSeq[posIdx]) ||
            (positionsToStyle === PositionsToStyle.CONSENSUS_DIFF && letter !== consensusSeq[posIdx])
          );

          if(true === true){
            //if (showElementsWithUnknownColors){ 
            //this is tricky to get right - we really want this only to be for the MSA
            //and not for for query/consensus, but that means retooling the query/consensus
            //rendering, i.e., not using the "use" elements. Also, we probably don't want to
            //do this when positionsToStyle === PositionsToStyle.ALL. Removing flag for now
            if(letterAtPosMatchesStyle) acc.push(letterColor);
            else{
              acc.push(
                { 
                  ...letterToColors[moleculeClass.UNKNOWN.singleLetterCode],
                  letter: letter //set the letter to be correct with the unknown style
                }
              )
            }
          }
          else if(
            letterAtPosMatchesStyle && 
            letterColor.backgroundColor !== 
              letterToColors[moleculeClass.UNKNOWN.singleLetterCode].backgroundColor
          ) {
            acc.push(letterColor);
          }
          return acc;
        }, [] as {
          letter: string;
          backgroundColor: string;
          letterColor: string
        }[]);
        
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
  // [MSA] the consensus and query msa squares (color box + AA/NT code)
  //
  const consensusString = [
    !includeMetadata 
      ? ""
      : getTitleTextElemString(
        `Consensus`, 
        offsets.metadata_and_titles.x,
        offsets.consensus.y + (moleculeHeight/2), 
      ),
    `<g transform="translate(${offsets.consensus.x}, ${offsets.consensus.y})">`,
    ...alignment.getConsensus().sequence.split("").map((letter, posIdx)=>{
      return `<use xlink:href="#${getIdForLetter(letter, posIdx)}" x="${posIdx * moleculeWidth}"/>`;
    }),
    `</g>`
  ].join("\n");

  const queryString = [
    !includeMetadata 
      ? ""
      : getTitleTextElemString(
        `Query`, 
        offsets.metadata_and_titles.x,
        offsets.query.y + (moleculeHeight/2), 
      ),
    `<g transform="translate(${offsets.query.x}, ${offsets.query.y})">`,
    ...alignment.getQuery().sequence.split("").map((letter, posIdx)=>{
      return `<use xlink:href="#${getIdForLetter(letter, posIdx)}" x="${posIdx * moleculeWidth}"/>`;
    }),
    `</g>`
  ].join("\n");

  //
  // [MSA] generate the MSA matrix of squares (color box + AA/NT code), each line represents
  // a single sequence and each use element is a single aa/nt
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
  // create the full file string
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
    getStylesheet(),
    `<defs>`,
    ...letterDefs,
    `</defs>`,
    barplotsString,
    logoString,
    includeConsensus ? consensusString : "",
    includeQuery ? queryString : "",
    includePositionAxis ? positionAxisString : "",
    ...(includeMetadata ? idElements : []),
    ...msa,
    `</svg>`
  ].join("\n");
  return fileContentsArr;
}
