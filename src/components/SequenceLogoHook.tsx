/**
 * Sequence logo hook.
 * Inspired / derived from https://github.com/weng-lab/logojs-package
 *  (but simpler)
 * Fills the available space
 */
import "./SequenceLogo.scss";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Tooltip, TooltipRefProps } from 'react-tooltip';
import { Alignment } from "../common/Alignment";
import { GlyphFactory, LogoFonts } from "../common/SequenceLogoGlyphs";
import {
  getLetterClassNames,
  AlignmentTypes,
  ResidueColoring,
  PositionsToStyleInstance,
  AminoacidColorSchemeInstance,
  NucleotideColorSchemeInstance,
  AminoAcidColorSchemes,
  NucleotideColorSchemes,
  AminoAcidAlignmentTypeInstance,
  NucleotideAlignmentTypeInstance,
} from "../common/MolecularStyles";
import { AminoAcid, Nucleotide } from "../common/Residues";
import {
  VirtualizedHorizontalViewer 
} from "./virtualization/VirtualizedMatrixViewerHook";
import { 
  IControllerRole, 
  IResponderRole, 
  IVirtualizeParamBasics, 
  IVirtualizeParams, 
  ScrollbarOptions,
  VirtualizationRole,
  VirtualizationStrategy 
} from "./virtualization/VirtualizationTypes";
import { IBounds } from "./ResizeSensorHook";
import { IListOfPropObjects, IPropObjectInstanceInList } from "../common/GlobalEnumObject";

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
  svgId: string;
  alignment: Alignment;
  glyphWidth: number;
  alignmentType: AminoAcidAlignmentTypeInstance | NucleotideAlignmentTypeInstance;
  aaColorScheme?: AminoacidColorSchemeInstance;
  ntColorScheme?: NucleotideColorSchemeInstance;
  positionsToStyle: PositionsToStyleInstance;

  //props that should be exposed in AlignmentViewer:
  logoType?: LogoTypeInstance; //letters or bars
  font?: LogoFonts;

  //tooltip
  tooltipPlacement?: tooltipPlacement;
  tooltipOffset?: number;

  //for the virtualization .. directly decomposed to VirtualizedHorizontalViewer 
  horizontalVirtualization?: IControllerRole | IResponderRole;

  //for the virtualization 
  hoverTracker?: IVirtualizeParamBasics["hoverTracker"];
}

export interface LogoTypeInstance extends IPropObjectInstanceInList{}
export const LogoType = (() => {
  const propList = {
    LETTERS: {
      key: "letter-stack",
      description: "Letter Stack"
    } satisfies LogoTypeInstance,
    BARS: {
      key: "stacked-bars",
      description: "Stacked Bar Plot"
    } satisfies LogoTypeInstance,
  };
  return {
    ...propList,
    ...IListOfPropObjects<LogoTypeInstance>(Object.values(propList))
  };
})();

export function SequenceLogo(props: ISequenceLogoProps) {
  const {
    svgId,
    alignment,
    glyphWidth,
    alignmentType,
    aaColorScheme = AminoAcidColorSchemes.list[0],
    ntColorScheme = NucleotideColorSchemes.list[0],
    positionsToStyle,
    tooltipPlacement = "left-start",
    tooltipOffset = 8, //distance that the arrow will be from the hoverd letter stack
    logoType = LogoType.LETTERS,
    font = LogoFonts.DEFAULT,
    horizontalVirtualization,
    hoverTracker = "end"
  } = props;
  const colorScheme = alignmentType === AlignmentTypes.AMINOACID
    ? aaColorScheme : ntColorScheme;

  const tooltipRef = useRef<TooltipRefProps>(null);
  const tooltipClosingTimeoutRef = useRef<NodeJS.Timeout>();
  const [
    calculatedTooltipOffset, setCalculatedTooltipOffset
  ] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);

  /**
   * Munge letter count data that was calculated during alignment creation
   * into a form appropriate for the glyph generation
   */
  const logoData = useMemo((): IGlyphStackData[] => {
    const numberSequences = alignment.getSequenceCount();
    const lettersSorted = alignment.getAllUpperAlphaLettersInAlignmentSorted();

    const moleculeClass =
      alignmentType === AlignmentTypes.AMINOACID ? AminoAcid : Nucleotide;

    //note: removes invalid letters, but letterCount (value) isn't sorted
    const plc = alignment.getPositionalLetterCounts(false, lettersSorted);
    return Array.from(plc).map(
      ([pos, letterCounts]): IGlyphStackData => {
        const queryLetter = alignment.getQuery().sequence[pos.valueOf()];
        const consensusLetter = alignment.getConsensus().sequence[pos.valueOf()];

        return Object.entries(letterCounts)
          .map(([letter, count]) => {
            return {
              count: count,
              frequency: count / numberSequences,
              letter: {
                letter: letter,
                classNames: getLetterClassNames(
                  letter, 
                  letter===consensusLetter, //can force coloring to always be gray by setting
                  letter===queryLetter      //these two parameters to false.
                ),
              } as ILetterWithClasses,
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
  }, [alignment, alignmentType]);

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

        if (logoType === LogoType.BARS) {
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
        offset={calculatedTooltipOffset}
      ></Tooltip>
    );
  }, [
    calculatedTooltipOffset,
    logoData,
    tooltipPlacement
  ]);
  
  //
  // tooltip itself is hovered .. keep it open
  //
  const tooltipHovered = useCallback(()=>{
    clearTimeout(tooltipClosingTimeoutRef.current); 
  }, []);

  //
  //close the tooltip
  //
  const closeTooltip = useCallback(()=>{
    tooltipClosingTimeoutRef.current = setTimeout(()=>{ 
      //allow a bit of time before closing in case the user wants
      //to interact with the tooltip
      tooltipRef.current?.close();
    }, 500);
  }, []);

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
      <div 
        className="logo-tooltip"
        onMouseEnter={tooltipHovered}
        onMouseLeave={closeTooltip}
        onClick={(e)=>{
          e.stopPropagation();
          e.preventDefault();
        }}
      >
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
  }, [
    logoData, 
    closeTooltip, 
    tooltipHovered
  ]);

  //
  // open the react tooltip
  //
  const openTooltip = useCallback((
    e: React.MouseEvent<SVGRectElement, MouseEvent>
  )=>{
    //stop any close timeout as an adjacent tip is now being opened 
    //and it uses the same tooltip.
    clearTimeout(tooltipClosingTimeoutRef.current); 

    const id = (e.target as SVGRectElement).getAttribute("data-tooltip-id")!;
    const posIdx = (e.target as SVGRectElement).getAttribute("data-tooltip-content")!;
    const boundingRect = (e.target as SVGRectElement).getBoundingClientRect();
    const content = getTooltipForPosition(posIdx!);

    if (content){
      setCalculatedTooltipOffset(
        tooltipOffset + (
          [
            "top", "top-start", "top-end", "bottom", "bottom-start", "bottom-end"
          ].includes(tooltipPlacement)
            ? (boundingRect.height/2)
            : (boundingRect.width/2)
        )
      );

      tooltipRef.current?.open({
        anchorSelect: id,
        content: content,
        position: {
          x: boundingRect.x + (boundingRect.width/2),
          y: boundingRect.y + (boundingRect.height/2),
        }
      });
    }
  }, [
    getTooltipForPosition,
    tooltipPlacement, 
    tooltipOffset
  ]);

  //
  // cache the positions
  //
  const positionsCache = useMemo(()=>{
    const sequenceLength = alignment.getSequenceLength();
    const positions: React.SVGProps<SVGGElement>[] = [];

    for (let positionIdx = 0; positionIdx < sequenceLength; positionIdx++) {
      const singlePositionData = logoData[positionIdx];
      if (singlePositionData.length > 0){
        positions.push(
          (
            <g
              transform={`translate(${positionIdx},0)`}
              key={"p_" + positionIdx}
            >
              {renderSinglePositionStack(singlePositionData, logoData.length)}
              <rect
                className="interaction-placeholder"
                width="1"
                height="100"
                data-tooltip-id={`logo${positionIdx}`}
                data-tooltip-content={positionIdx}
                onMouseEnter={openTooltip}
                onMouseLeave={closeTooltip}
              ></rect>
            </g>
          ) as React.SVGProps<SVGGElement>
        );
      }
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

    const moleculeClass =
      alignmentType === AlignmentTypes.AMINOACID ? AminoAcid : Nucleotide;

    const defaultColor = moleculeClass.UNKNOWN.colors.get(
        colorScheme
      )?.get(
        ResidueColoring.NO_BACKGROUND
      )?.letterColor.hexString;
  
    return (
      <svg
        id={svgId}
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
        {!defaultColor ? undefined : ( //defaults
          <style type="text/css">{`
            .av2-sequence-logo path{
              color: ${defaultColor};
              fill: ${defaultColor};
            }
            .av2-sequence-logo rect{
              color: ${defaultColor};
              fill: ${defaultColor};
            }
          `}</style>
        )}
        {positionsCache}
      </svg>
    );
  }, [
    alignment,
    glyphWidth,
    height,
    positionsCache,
    alignmentType,
    colorScheme,
    svgId
  ]);

  const fullLogoRendered = useMemo(()=>{
    const classNames = [
      "sequence-logo-holder",
      alignmentType.className,
      colorScheme.className,
      positionsToStyle.className
    ];

    return (
      <div
        className={classNames.join(" ")}
        style={{
          width: alignment.getSequenceLength() * glyphWidth,
        }}
      >
        {renderedSvg}
        {renderedTooltip}
      </div>
    )
  }, [
    alignment, 
    glyphWidth, 
    positionsToStyle,
    renderedSvg, 
    renderedTooltip, 
    alignmentType.className, 
    colorScheme.className
  ]);

  const containerBoundsUpdated = useCallback((bounds: IBounds)=>{
    setHeight(bounds.height);
  }, []);

  const contentCache = useCallback(()=>{
    //RENDER ENTIRE CACHED IMAGE AND JUST ADJUST LEFT OFFSET. Quick on
    //sequences of reasonable length - need to check for longer sequences. It adds
    //~20 x length of sequences dom elements, which could add up, but is probably
    //fine
    return fullLogoRendered;
  }, [fullLogoRendered])

  const paramsCache: IVirtualizeParams = useMemo(()=>{
    return {
      ...(
        horizontalVirtualization
          ? horizontalVirtualization
          : {//virtualization if caller doesn't provide (for standalone use - needs testing)
            virtualizationId: `logo-${alignment.getUUID()}`,
            role: VirtualizationRole.Controller,
            cellCount: alignment.getSequenceLength(),
            cellSizePx: glyphWidth
          }
      ),
      virtualizationStrategy: VirtualizationStrategy.ShiftOnlyFullyRendered,
      scrollbar: ScrollbarOptions.NeverOn,
      hoverTracker: hoverTracker,
      containerBoundsUpdated: containerBoundsUpdated
    };
  }, [
    alignment,
    containerBoundsUpdated,
    glyphWidth, 
    horizontalVirtualization,
    hoverTracker
  ]);
  
  //OPTION 2: VIRTUALIZATION
  return (
    <VirtualizedHorizontalViewer
      getContentForColumns={contentCache}
      horizontalParams={paramsCache}
    />
  );
}
