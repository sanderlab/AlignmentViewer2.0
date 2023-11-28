/**
 * Sequence logo hook.
 * Inspired / derived from https://github.com/weng-lab/logojs-package
 *  (but simpler)
 */
import React, { useCallback, useMemo } from "react";
import "./SequenceLogo.scss";
import { Tooltip } from 'react-tooltip';
import { Alignment } from "../common/Alignment";
import { GlyphFactory } from "../common/SequenceLogoGlyphs";
import {
  aceResidueParentClass,
  getLetterClassNames,
  AlignmentTypes,
  AminoAcidAlignmentStyle,
  NucleotideAlignmentStyle,
  PositionsToStyle,
} from "../common/MolecularStyles";
import { AminoAcid, Nucleotide } from "../common/Residues";
import { VirtualizedMatrixViewer } from "./virtualization/VirtualizedMatrixViewerHook";

export enum LOGO_TYPES {
  LETTERS = "Letter Stack",
  BARS = "Bar Plot",
}

interface ILetterWithClasses {
  letter: string;
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
    tooltipPlacement = undefined,
    logoType = LOGO_TYPES.LETTERS,
    height = 100,
    horizontalReduxId,
  } = props;

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
        classNames: getLetterClassNames(letter, false, false, false),
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

  //render teh tooltip 
  const renderedTooltip = useMemo(() => {
    const getTooltipForPosition = (pos: string) => {
      if (!pos || !logoData || !logoData[parseInt(pos)]) {
        return;
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
    }

    return !logoData ? null : (
      <Tooltip
        id="getLogoTooltip"
        className="sequence-logo-tooltip-container"
        border="solid black 1px"
        openEvents={{"mouseenter": true, "focus": false}}
        closeEvents={{"mouseleave": true, "blur": false}}
        globalCloseEvents={{
          "clickOutsideAnchor": true,
          "escape": true, 
          "scroll": true, 
          "resize": true
        }}
        place={tooltipPlacement}
        render={({ content }) => {
          return getTooltipForPosition(content!);
        }}
      ></Tooltip>
    );
  }, [tooltipPlacement, logoData]);
  

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

        const selectedGlyph = GlyphFactory.glyphFromChar(freq.letter.letter)({
          className: freq.letter.classNames,
          transform: `translate(0, ${dy}) scale(${xscale},${freq.frequency})`,
          key: `idxglyph_${idx}`,
        });
        return selectedGlyph;
      });
  }, [logoType]);

  const positionsCache = useMemo(()=>{
    const sequenceLength = alignment.getSequenceLength();
    const positions: React.SVGProps<SVGGElement>[] = [];

    for (let positionIdx = 0; positionIdx < sequenceLength; positionIdx++) {
      const singlePositionData = logoData[positionIdx];
      positions.push(
        (
          <g
            transform={`translate(${positionIdx},0)`}
            className={aceResidueParentClass} //required for default coloring
            key={"p_" + positionIdx}
          >
            {renderSinglePositionStack(singlePositionData, logoData.length)}
            <rect
              className="interaction-placeholder"
              width="1"
              height="100"
              data-tooltip-id="getLogoTooltip"
              data-tooltip-content={positionIdx}
              data-tooltip-position-strategy="fixed"
              data-tooltip-variant="light"
            ></rect>
          </g>
        ) as React.SVGProps<SVGGElement>
      );
    }
    return positions;
  }, [alignment, logoData, renderSinglePositionStack]);

  //setup cache - each glyph stack as a svg g element is saved in memory for quick render
  const renderedSvg = useMemo(() => {
    const sequenceLength = alignment.getSequenceLength();
    const totalWidth = sequenceLength * glyphWidth;

    return (
      <svg
        preserveAspectRatio="none"
        viewBox={`0 0 ${sequenceLength} 100`}
        style={{
          width: totalWidth,
          height: height ? height : height,
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
      "sequence-logo",
      style.alignmentType.className,
      style.colorScheme.className,
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
    style.colorScheme.className
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
      suppressVerticalScrollbar={true}
      suppressHorizontalScrollbar={true}
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
                      className={aceResidueParentClass} //required for default coloring
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
