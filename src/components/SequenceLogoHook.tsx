/**
 * Sequence logo hook.
 * Inspired / derived from https://github.com/weng-lab/logojs-package
 *  (but simpler)
 */
import React, { useCallback, useMemo, useRef } from "react";
import "./SequenceLogo.scss";
import { Tooltip, TooltipRefProps } from 'react-tooltip';
import { Alignment } from "../common/Alignment";
import { GlyphFactory, LogoFonts } from "../common/SequenceLogoGlyphs";
import {
  residueParentClass,
  getLetterClassNames,
  AlignmentTypes,
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  PositionsToStyle,
} from "../common/MolecularStyles";
import { AminoAcid, Nucleotide } from "../common/Residues";
import { ScrollbarOptions, VirtualizedMatrixViewer } from "./virtualization/VirtualizedMatrixViewerHook";

export enum LOGO_TYPES {
  LETTERS = "Letter Stack",
  BARS = "Bar Plot",
}
interface ILetterWithClasses {
  letter: AvailableGlyphs;
  classNames: string;
}
interface IGlyphFrequency {
  count: number;
  frequency: number;
  letter: ILetterWithClasses;
  residue: AminoAcid | Nucleotide;
}
interface IGlyphStackData extends Array<IGlyphFrequency> {}

export interface ISequenceLogoProps {
  //don't expose these props in AlignmentViewer
  alignment: Alignment;
  glyphWidth: number;
  style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle;
  refUpdated?: (newRef: HTMLElement | null) => void;
  font?: LogoFonts;

  //props that should be exposed in AlignmentViewer:
  logoType?: LOGO_TYPES;
  tooltipPlacement?: "top" | "right" | "bottom" | "left"; //default to undefined => automatic
  height?: number;
  horizontalReduxId?: string;
}

export function SequenceLogo(props: ISequenceLogoProps) {
  const {
    alignment,
    glyphWidth,
    style,
    tooltipPlacement = "bottom",
    logoType = LOGO_TYPES.LETTERS,
    height = 100,
    font = LogoFonts.DEFAULT,
    horizontalReduxId,
  } = props;

  const tooltipRef = useRef<TooltipRefProps>(null)
  
  /**
   * Munge letter count data that was calculated during alignment creation
   * into a form appropriate for the glyph generation
   */
  const logoData = useMemo((): IGlyphStackData[] => {
    const numberSequences = alignment.getSequenceCount();
    const lettersSorted = alignment.getAllUpperAlphaLettersInAlignmentSorted();

    const moleculeClass =
      style.alignmentType === AlignmentTypes.AMINOACID ? AminoAcid : Nucleotide;

    //load class names for each letter
    const letterObjects = lettersSorted.reduce((arr, letter) => {
      arr[letter] = {
        letter: letter,
        classNames: getLetterClassNames(letter, false, false),
      };
      return arr;
    }, {} as { [letter: string]: ILetterWithClasses });

    //note: removes invalid letters, but letterCount (value) isn't sorted
    const plc = alignment.getPositionalLetterCounts(false, lettersSorted);
    return Array.from(plc).map(
      ([pos, letterCounts]): IGlyphStackData => {
        return Object.entries(letterCounts)
          .map(([letter, count]) => {
            return {
              count: count,
              frequency: count / numberSequences,
              letter: letterObjects[letter],
              residue: moleculeClass.fromSingleLetterCode(letter),
            };
          })
          .filter((freq) => {
            // remove empty letters
            return freq.frequency !== 0;
          })
          .sort((a, b) => (a.frequency > b.frequency ? 1 : -1));
      }
    );
  }, [alignment, style.alignmentType]);

  /**
   * Generate the svg elements for a single position, i.e., column
   */
  const renderSinglePositionStack = useCallback((
    positionalFrequencies: IGlyphStackData, 
    numGlyphStacks: number
  ) => {
      let dy = 100;

      return positionalFrequencies.map((freq, idx) => {
        dy = dy - freq.frequency * 100;
        const xscale = 0.009; // invariant scaling, not exact, but works.

        if (logoType === LOGO_TYPES.BARS) {
          return (
            <rect
              width="100"
              height="100"
              transform={`translate(0, ${dy}) scale(${xscale},${freq.frequency})`}
              className={freq.letter.classNames}
              key={`idxrect_${idx}`}
            ></rect>
          );
        }
        const selectedGlyph = GlyphFactory.glyphFromChar(
          freq.letter.letter, font//LogoFonts.ROBOTO_MONO_MEDIUM
        )({
          className: freq.letter.classNames,
          transform: `translate(0, ${dy}) scale(${xscale},${freq.frequency})`,
          key: `idxglyph_${idx}`,
        });
        return selectedGlyph;
      });
  }, [logoType, font]);

  //
  // tooltip stuff
  //

  //
  //render the tooltip 
  //

  //
  // the react tooltip declaration. enables us to grab a reference
  // to the tooltip and show hide on mouseover of individual positions
  //
  const renderedTooltip = useMemo(() => {
    return !logoData ? null : (
      <Tooltip
        ref={tooltipRef}
        className="sequence-logo-tooltip-container"
        border="solid black 1px"
        positionStrategy="fixed"
        variant="light"
        imperativeModeOnly={true}
        place={tooltipPlacement}
      ></Tooltip>
    );
  }, [logoData, tooltipPlacement]);
  

  //
  // generate the actual tooltip with logo stats
  //
  const getTooltipForPosition = useCallback((pos: string) => {
    if (!pos || !logoData || !logoData[parseInt(pos)]) {
      return null;
    }

    const position = parseInt(pos) + 1;
    const glyphData = logoData[parseInt(pos)];
    return glyphData.length === 0 ? null : (
      <div className="logo-tooltip">
        <h1>Position: {position}</h1>
        <div className="row">
          <div className="col legend-square"></div>
          <div className="col header name">Residue</div>
          <div className="col header frequency">Frequency</div>
          <div className="col header count">Count</div>
        </div>
        {glyphData
          .slice()
          .reverse()
          .map((letterFreq, myidx) => {
            return (
              <div key={myidx} className="row">
                <div
                  className={`col legend-square ${letterFreq.letter.classNames}`}
                ></div>
                <div className="col name">
                  {`${letterFreq.residue.fullName} [${letterFreq.letter.letter}]`}
                </div>
                <div className="col frequency">
                  {+(letterFreq.frequency * 100).toFixed(2)}%
                </div>
                <div className="col count">{letterFreq.count}</div>
              </div>
            );
          })}
      </div>
    );
  }, [logoData]);


  //
  // open the react tooltip
  //
  const openTooltip = useCallback((
    e: React.MouseEvent<SVGRectElement, MouseEvent>
  )=>{
    const id = (e.target as SVGRectElement).getAttribute("data-tooltip-id")!;
    const posIdx = (e.target as SVGRectElement).getAttribute("data-tooltip-content")!;
    const boundingRect = (e.target as SVGRectElement).getBoundingClientRect();
    const content = getTooltipForPosition(posIdx!);
    if (content){
      tooltipRef.current?.open({
        anchorSelect: id,
        content: content,
        position: {
          x:boundingRect.x + (boundingRect.width/2),
          y:boundingRect.y + boundingRect.height,
        }
      })
    }
  }, [getTooltipForPosition]);

  //
  //close the react tooltip
  //
  const closeTooltip = useCallback((
    e: React.MouseEvent<SVGRectElement, MouseEvent>
  )=>{
    tooltipRef.current?.close();
  }, [tooltipRef]);


  //
  // cache the positions
  //
  const positionsCache = useMemo(()=>{
    const sequenceLength = alignment.getSequenceLength();
    const positions: React.SVGProps<SVGGElement>[] = [];

    for (let positionIdx = 0; positionIdx < sequenceLength; positionIdx++) {
      const singlePositionData = logoData[positionIdx];
      positions.push(
        (
          <g
            transform={`translate(${positionIdx},0)`}
            className={residueParentClass} //required for default coloring
            key={"p_" + positionIdx}
          >
            {renderSinglePositionStack(singlePositionData, logoData.length)}
            <rect
              data-tooltip-id={`logo${positionIdx}`}
              className="interaction-placeholder"
              width="1"
              height="100"
              data-tooltip-content={positionIdx}
              onMouseEnter={openTooltip}
              onMouseLeave={closeTooltip}
            ></rect>
          </g>
        ) as React.SVGProps<SVGGElement>
      );
    }
    return <>{positions}</>;
  }, [
    alignment, 
    logoData, 
    renderSinglePositionStack,
    openTooltip, 
    closeTooltip
  ]);

  //setup cache - each glyph stack as a svg g element is saved in memory for quick render
  const renderedSvg = useMemo(() => {
    const sequenceLength = alignment.getSequenceLength();
    const totalWidth = sequenceLength * glyphWidth;

    return (
      <svg
        className="av2-sequence-logo"
        preserveAspectRatio="none"
        viewBox={`0 0 ${sequenceLength} 100`}
        width={`${totalWidth}px`}
        height={`${height}px`}
        style={{
          width: totalWidth, //not respected in illustrator when exported
          height: height,    //hence also adding the attributes above
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {positionsCache}
      </svg>
    );
  }, [
    alignment,
    glyphWidth,
    height,
    positionsCache,
  ]);

  const renderFullLogoAndOffset = useCallback((
    colIdxsToRender: number[],
    additionalHorizontalOffset: number
  )=>{
    const classNames = [
      "sequence-logo-holder",
      style.alignmentType.className,
      style.selectedColorScheme.className,
      PositionsToStyle.ALL.className,
    ];

    return (
      <div
        className={classNames.join(" ")}
        style={{
          width: alignment.getSequenceLength() * glyphWidth,
          left:
            colIdxsToRender.length > 0
              ? colIdxsToRender[0] * glyphWidth * -1 + additionalHorizontalOffset
              : additionalHorizontalOffset,
        }}
      >
        {renderedSvg}
        {renderedTooltip}
      </div>
    )
  }, [
    alignment, 
    glyphWidth, 
    renderedSvg, 
    renderedTooltip, 
    style.alignmentType.className, 
    style.selectedColorScheme.className
  ]);

  //OPTION 2: VIRTUALIZATION
  return (
    <VirtualizedMatrixViewer
      horizontalReduxId={horizontalReduxId}
      direction="x"
      columnCount={alignment.getSequenceLength()}
      columnWidth={glyphWidth}
      rowCount={1}
      rowHeight={height}
      autoOffset={false} //manage the offset manually
      verticalScrollbar={ScrollbarOptions.NeverOn}
      horizontalScrollbar={ScrollbarOptions.NeverOn}
      getContent={({
        colIdxsToRender,
        additionalHorizontalOffset,
      }) => {
        //OPTION 2A: RENDER ENTIRE CACHED IMAGE AND JUST ADJUST LEFT OFFSET. Quick on
        //sequences of reasonable length - need to check for longer sequences. It adds
        //~20 x length of sequences dom elements, which could add up, but is probably
        //fine
        return renderFullLogoAndOffset(
          colIdxsToRender, 
          additionalHorizontalOffset
        );

        /* //OPTION 2B: USING VIRTUALIZATION, BUT CACHE POSITIONS - this is slow
        return (
          <>
            <div
              className={classNames.join(" ")}
            >
              <svg
                preserveAspectRatio="none"
                viewBox={`0 0 ${colIdxsToRender.length} 100`}
                style={{
                  width: colIdxsToRender.length * glyphWidth,
                  height: height ? height : height,
                }}
                xmlns="http://www.w3.org/2000/svg"
              >
                {colIdxsToRender.map((colIdx, arrIdx) => {
                  if (!positionsCache || !positionsCache[colIdx]) {
                    return;
                  }
                  const pos = positionsCache[colIdx];
                  return (
                    <g
                      transform={`translate(${arrIdx},0)`}
                      className={residueParentClass} //required for default coloring
                      key={"p_" + pos.positionIdx}
                    >
                      {pos.positionStack}
                    </g>
                  );
                })}
              </svg>
            </div>
          </>
        );*/
      }}
    />
  );
}
